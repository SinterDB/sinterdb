import { project } from "@/app/docs/api/_generated/project";

/**
 * Resolves names like `SinterClient`, `SinterCollection.findOne` or
 * `types/SinterErrorCode` to generated API routes. Unknown names throw, so a
 * renamed export breaks the build instead of leaving a dead link.
 */
const items = project.navigation.flatMap((group) => group.items);
const deprecations = new Map(
  project.deprecated.map((item) => [item.href, item]),
);
const warned = new Set<string>();

export interface ResolvedApiLink {
  readonly href: string;
  readonly kind: string;
  /** Tooltip text when the target is deprecated, otherwise null. */
  readonly deprecated: string | null;
}

export function resolveApiLink(reference: string): ResolvedApiLink {
  const [qualified, ...memberPath] = reference.split(".");
  const [directory, name] = qualified.includes("/")
    ? qualified.split("/", 2)
    : [null, qualified];

  const matches = items.filter(
    (item) =>
      item.name === name &&
      (directory === null || item.href.split("/").at(-2) === directory),
  );

  if (matches.length === 0) {
    throw new Error(
      `Unknown API reference "${reference}". Check the name, or regenerate the API docs.`,
    );
  }

  if (matches.length > 1) {
    const options = matches
      .map((item) => `"${item.href.split("/").slice(-2).join("/")}"`)
      .join(" or ");
    throw new Error(`Ambiguous API reference "${reference}". Use ${options}.`);
  }

  const [item] = matches;
  const member = memberPath.join(".");
  const href = member ? `${item.href}#${toAnchor(member)}` : item.href;
  const deprecation = deprecations.get(href);

  // A guide pointing at a deprecated API probably needs updating.
  if (deprecation && !warned.has(reference)) {
    warned.add(reference);
    console.warn(
      `[docs] "${reference}" is deprecated${deprecation.reason ? `: ${deprecation.reason}` : "."}`,
    );
  }

  return {
    href,
    kind: item.kind,
    deprecated: deprecation
      ? [
          "Deprecated",
          deprecation.inheritedFrom &&
            ` (${deprecation.inheritedFrom} is deprecated)`,
          deprecation.reason && `: ${deprecation.reason}`,
        ]
          .filter(Boolean)
          .join("")
      : null,
  };
}

/** Same rule the API generator uses for member anchors. */
function toAnchor(name: string) {
  return (
    name
      .replaceAll(/([a-z0-9])([A-Z])/gu, "$1-$2")
      .replaceAll(/[^a-zA-Z0-9_-]+/gu, "-")
      .replaceAll(/^-+|-+$/gu, "")
      .toLowerCase() || "member"
  );
}
