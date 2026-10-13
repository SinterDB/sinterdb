import { ReflectionKind } from "typedoc";

import { getKindName } from "./navigation.js";

/**
 * @typedef {object} HierarchyNode
 * @property {string} name
 * @property {string | null} href
 * @property {string | null} kind
 * @property {boolean} deprecated
 * @property {boolean} current
 * @property {HierarchyNode[]} children
 */

/**
 * Inheritance around one class or interface: its ancestors, itself, and
 * the types that directly extend or implement it.
 *
 * @param {import("typedoc").DeclarationReflection} reflection
 * @param {import("./context.js").ModelContext} ctx
 * @returns {HierarchyNode | null}
 */
export function createHierarchyNode(reflection, ctx) {
  if (!reflection.kindOf(ReflectionKind.ClassOrInterface)) {
    return null;
  }

  const descendants = [
    ...(reflection.extendedBy ?? []),
    ...(reflection.implementedBy ?? []),
  ].map((type) => referenceNode(type, ctx));

  /** @type {HierarchyNode} */
  let node = {
    name: reflection.name,
    href: null,
    kind: getKindName(reflection.kind),
    deprecated: ctx.deprecationFor(reflection) !== null,
    current: true,
    children: descendants,
  };

  let parentType = reflection.extendedTypes?.[0];
  const seen = new Set([reflection.id]);
  let depth = 0;

  while (parentType?.type === "reference") {
    node = { ...referenceNode(parentType, ctx), children: [node] };
    depth += 1;

    const parent = parentType.reflection;
    if (!parent?.isDeclaration() || seen.has(parent.id)) {
      break;
    }
    seen.add(parent.id);
    parentType = parent.extendedTypes?.[0];
  }

  return depth === 0 && descendants.length === 0 ? null : node;
}

/**
 * Inheritance forest for the hierarchy page. Types whose base is outside
 * the project are grouped under that base, e.g. `Error`.
 *
 * @param {import("./context.js").ModelContext} ctx
 * @returns {HierarchyNode[]}
 */
export function createHierarchyForest(ctx) {
  const types = ctx.pages
    .map((page) => page.reflection)
    .filter((reflection) => reflection.kindOf(ReflectionKind.ClassOrInterface));

  const ids = new Set(types.map((reflection) => reflection.id));
  /** @type {Map<string, HierarchyNode>} */
  const externalRoots = new Map();
  const roots = [];

  const build = (reflection) => ({
    name: reflection.name,
    href: ctx.hrefForReflection(reflection),
    kind: getKindName(reflection.kind),
    deprecated: ctx.deprecationFor(reflection) !== null,
    current: false,
    children: types
      .filter(
        (child) => child.extendedTypes?.[0]?.reflection?.id === reflection.id,
      )
      .map(build),
  });

  for (const reflection of types) {
    const base = reflection.extendedTypes?.[0];

    if (
      base?.type === "reference" &&
      base.reflection &&
      ids.has(base.reflection.id)
    ) {
      continue;
    }

    if (base?.type === "reference") {
      const key = base.toString();
      if (!externalRoots.has(key)) {
        const root = { ...referenceNode(base, ctx), children: [] };
        externalRoots.set(key, root);
        roots.push(root);
      }
      externalRoots.get(key).children.push(build(reflection));
    } else {
      roots.push(build(reflection));
    }
  }

  return roots
    .filter((root) => root.children.length > 0)
    .toSorted(
      (a, b) =>
        b.children.length - a.children.length || a.name.localeCompare(b.name),
    );
}

/** @param {import("typedoc").ReferenceType} type */
function referenceNode(type, ctx) {
  const target = type.reflection;

  return {
    name: type.toString(),
    href: ctx.hrefForReference(type),
    kind: target ? getKindName(target.kind) : null,
    deprecated: target ? ctx.deprecationFor(target) !== null : false,
    current: false,
    children: [],
  };
}
