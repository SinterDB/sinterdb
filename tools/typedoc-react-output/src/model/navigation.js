import { ReflectionKind } from "typedoc";

const KIND_DIRECTORIES = new Map([
  [ReflectionKind.Class, "classes"],
  [ReflectionKind.Interface, "interfaces"],
  [ReflectionKind.TypeAlias, "types"],
  [ReflectionKind.Variable, "variables"],
  [ReflectionKind.Function, "functions"],
  [ReflectionKind.Enum, "enums"],
  [ReflectionKind.Namespace, "namespaces"],
  [ReflectionKind.Module, "modules"],
]);

/** Short kind identifier used for icons and CSS, e.g. `type-alias`. */
export function getKindName(kind) {
  return ReflectionKind.classString(kind).replace(/^tsd-kind-/u, "");
}

/** Human-readable singular kind, e.g. `Type Alias`. */
export function getKindLabel(kind) {
  return ReflectionKind.singularString(kind);
}

export function getKindDirectory(kind) {
  return KIND_DIRECTORIES.get(kind) ?? "other";
}

export function createSlug(name) {
  return name.replaceAll(/[^a-zA-Z0-9._-]/gu, "-");
}

export function createAnchor(name) {
  const anchor = name
    .replaceAll(/([a-z0-9])([A-Z])/gu, "$1-$2")
    .replaceAll(/[^a-zA-Z0-9_-]+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "")
    .toLowerCase();

  return anchor || "member";
}

/**
 * Hands out anchors that are unique within one page.
 */
export class AnchorRegistry {
  #used = new Set(["top", "overview", "type-parameters", "hierarchy", "index"]);

  /** @param {string} name */
  take(name) {
    const base = createAnchor(name);
    let anchor = base;
    let counter = 2;

    while (this.#used.has(anchor)) {
      anchor = `${base}-${counter}`;
      counter += 1;
    }

    this.#used.add(anchor);
    return anchor;
  }
}
