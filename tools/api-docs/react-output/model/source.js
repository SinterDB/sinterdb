import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

/**
 * @typedef {object} SourceModel
 * @property {string} path Repository-relative path.
 * @property {number} line One-based line.
 * @property {string | null} url
 */

/**
 * Resolves declaration locations to the original sources.
 *
 * The API reference is generated from the driver's emitted `.d.ts` files,
 * which are build output and not in git. When a declaration map sits next
 * to the file, the location is mapped back to the `.ts` source so links
 * point at real code in the repository.
 */
export class SourceResolver {
  /** @type {Map<string, Array<Array<[number, number, number]>> | null>} */
  #maps = new Map();

  /**
   * @param {{ repository: string | null; revision: string | null; enabled: boolean }} options
   */
  constructor({ repository, revision, enabled }) {
    this.enabled = enabled;
    this.root = enabled ? findGitRoot(process.cwd()) : null;
    this.repository =
      repository ?? (this.root ? detectRepository(this.root) : null);
    this.revision =
      revision ?? (this.root ? detectRevision(this.root) : null) ?? "main";
  }

  /**
   * @param {import("typedoc").Reflection} reflection
   * @returns {SourceModel[]}
   */
  resolve(reflection) {
    if (!this.enabled || !("sources" in reflection) || !reflection.sources) {
      return [];
    }

    return reflection.sources.flatMap((source) => {
      const location = this.#original(source);

      if (!location || location.path.includes("node_modules")) {
        return [];
      }

      return [
        {
          path: location.path,
          line: location.line,
          url: this.repository
            ? `${this.repository}/blob/${this.revision}/${location.path}#L${location.line}`
            : null,
        },
      ];
    });
  }

  /** @param {import("typedoc").SourceReference} source */
  #original(source) {
    const file = source.fullFileName;
    const mapped = file.endsWith(".d.ts")
      ? this.#mapDeclaration(file, source.line - 1)
      : null;
    const path = mapped?.file ?? file;

    return {
      path: this.root
        ? relative(this.root, path).split(sep).join("/")
        : source.fileName,
      line: mapped ? mapped.line + 1 : source.line,
    };
  }

  #mapDeclaration(file, line) {
    const map = this.#loadMap(file);
    const segment = map?.lines[line]?.[0];

    if (!segment) {
      return null;
    }

    return { file: map.sources[segment[0]], line: segment[1] };
  }

  #loadMap(file) {
    if (this.#maps.has(file)) {
      return this.#maps.get(file);
    }

    let map = null;
    const mapFile = `${file}.map`;

    if (existsSync(mapFile)) {
      try {
        const raw = JSON.parse(readFileSync(mapFile, "utf8"));
        const base = resolve(dirname(mapFile), raw.sourceRoot ?? "");
        map = {
          sources: raw.sources.map((source) => join(base, source)),
          lines: decodeMappings(raw.mappings),
        };
      } catch {
        map = null;
      }
    }

    this.#maps.set(file, map);
    return map;
  }
}

const BASE64 = new Map(
  [..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"].map(
    (char, index) => [char, index],
  ),
);

/**
 * Minimal source map v3 decoder. Returns, per generated line, the
 * segments as `[sourceIndex, originalLine, originalColumn]`.
 *
 * @param {string} mappings
 */
function decodeMappings(mappings) {
  const state = [0, 0, 0];

  return mappings.split(";").map((line) =>
    line
      .split(",")
      .filter(Boolean)
      .flatMap((segment) => {
        const fields = decodeVlq(segment);

        if (fields.length < 4) {
          return [];
        }

        state[0] += fields[1];
        state[1] += fields[2];
        state[2] += fields[3];
        return [[state[0], state[1], state[2]]];
      }),
  );
}

function decodeVlq(segment) {
  const values = [];
  let value = 0;
  let shift = 0;

  for (const char of segment) {
    const digit = BASE64.get(char) ?? 0;
    value += (digit & 31) << shift;

    if (digit & 32) {
      shift += 5;
      continue;
    }

    values.push(value & 1 ? -(value >>> 1) : value >>> 1);
    value = 0;
    shift = 0;
  }

  return values;
}

function findGitRoot(start) {
  let directory = start;

  while (true) {
    if (existsSync(join(directory, ".git"))) {
      return directory;
    }

    const parent = dirname(directory);
    if (parent === directory) {
      return null;
    }
    directory = parent;
  }
}

function git(root, args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function detectRepository(root) {
  const remote = git(root, ["remote", "get-url", "origin"]);

  if (!remote) {
    return null;
  }

  const match =
    /github\.com[:/](?<owner>[^/]+)\/(?<repo>[^/]+?)(?:\.git)?$/u.exec(remote);
  return match
    ? `https://github.com/${match.groups.owner}/${match.groups.repo}`
    : null;
}

/**
 * The release tag when HEAD is tagged, so published docs link to the exact
 * release. Between releases this returns null and links use `main`, so a
 * regenerate doesn't rewrite every page just because the commit changed.
 */
function detectRevision(root) {
  return git(root, ["describe", "--tags", "--exact-match", "HEAD"]);
}
