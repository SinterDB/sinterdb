import { ReflectionKind } from "typedoc";

import { createCommentModel } from "./comments.js";
import { createHierarchyForest } from "./hierarchy.js";
import { createAnchor, getKindLabel, getKindName } from "./navigation.js";
import { createPageModel } from "./reflection.js";

/**
 * @param {import("./context.js").ModelContext} ctx
 */
export function createProjectModel(ctx) {
  const { project } = ctx;
  const pageById = new Map(ctx.pages.map((plan) => [plan.reflection.id, plan]));

  const groups = splitErrorGroup(project.groups ?? [], ctx)
    .map((group) => ({
      id: createAnchor(group.title),
      title: group.title,
      items: group.children
        .filter((child) => pageById.has(child.id))
        .map((child) => {
          const comment = createCommentModel(
            child.comment ??
              (child.isDeclaration()
                ? child.signatures?.[0]?.comment
                : undefined),
            ctx,
          );

          return {
            id: child.id,
            name: child.name,
            href: pageById.get(child.id).href,
            kind: getKindName(child.kind),
            label: getKindLabel(child.kind),
            short: comment?.short ?? "",
            deprecated: ctx.deprecationFor(child) !== null,
            since: child.isDeclaration() ? ctx.sinceFor(child) : null,
          };
        }),
    }))
    .filter((group) => group.items.length > 0);

  const projectComment = createCommentModel(project.comment, ctx);

  // Pages first: building them records which types each signature uses.
  const pages = ctx.pages.map((plan) => ({
    route: plan.route,
    page: createPageModel(plan, ctx),
  }));

  for (const { page } of pages) {
    page.usedBy = ctx.usedBy(page.href);

    if (page.usedBy.length > 0) {
      page.toc = [...page.toc, { id: "used-by", title: "Used by", items: [] }];
    }
  }

  const search = createSearchIndex(pages);

  return {
    name: project.name,
    href: ctx.routeBase || "/",
    summary: projectComment?.summary ?? "",
    hierarchyHref: ctx.options.features.hierarchy
      ? `${ctx.routeBase}/hierarchy`
      : null,
    /** Sidebar and index data: groups without page summaries are cheap to inline everywhere. */
    navigation: groups.map((group) => ({
      id: group.id,
      title: group.title,
      items: group.items.map(({ id, name, href, kind, deprecated }) => ({
        id,
        name,
        href,
        kind,
        deprecated,
      })),
    })),
    index: groups,
    /** Every deprecated page and member, so links anywhere can be marked. */
    deprecated: ctx.deprecations,
    newIn: createNewIn(search),
    hierarchy: ctx.options.features.hierarchy ? createHierarchyForest(ctx) : [],
    pages,
    search,
  };
}

/**
 * Moves classes that extend `Error` out of "Classes" into an "Errors" group
 * right after it, so the classes people use most aren't buried among error
 * types. Turned off with `features.errorGroup: false`.
 *
 * @param {import("typedoc").ReflectionGroup[]} groups
 * @param {import("./context.js").ModelContext} ctx
 */
function splitErrorGroup(groups, ctx) {
  if (!ctx.options.features.errorGroup) {
    return groups;
  }

  return groups.flatMap((group) => {
    if (!group.children.every((child) => child.kindOf(ReflectionKind.Class))) {
      return [group];
    }

    const errors = group.children.filter(isErrorClass);

    if (errors.length === 0 || errors.length === group.children.length) {
      return [group];
    }

    return [
      {
        title: group.title,
        children: group.children.filter((child) => !errors.includes(child)),
      },
      { title: "Errors", children: errors },
    ];
  });
}

/** Whether a class extends `Error`, directly or through other classes. */
function isErrorClass(reflection) {
  let type = reflection.extendedTypes?.[0];
  const seen = new Set();

  while (type?.type === "reference") {
    const parent = type.reflection;

    if (!parent) {
      return type.name === "Error";
    }

    if (seen.has(parent.id) || !parent.isDeclaration()) {
      return false;
    }

    seen.add(parent.id);
    type = parent.extendedTypes?.[0];
  }

  return false;
}

/**
 * Every page and anchored member with a one-line summary and declaration,
 * for search and for hover previews of type links.
 */
function createSearchIndex(pages) {
  const entries = [];

  for (const { page } of pages) {
    entries.push({
      name: page.name,
      parent: null,
      kind: page.kind,
      href: page.href,
      summary: page.description,
      code: codeText(page.declaration ?? page.signatures[0]?.code),
      deprecated: page.badges.includes("deprecated"),
      since: page.since,
    });

    for (const section of page.sections) {
      for (const member of section.members) {
        if (!member.anchor) {
          continue;
        }

        entries.push({
          name: member.name,
          parent: page.name,
          kind: member.kind,
          href: `${page.href}#${member.anchor}`,
          summary: htmlToText(
            member.comment?.short ?? member.signatures[0]?.comment?.short ?? "",
          ),
          code: codeText(member.code ?? member.signatures[0]?.code),
          deprecated: member.deprecated,
          since: member.since,
        });
      }
    }
  }

  return entries;
}

/** The newest `@since` version and everything added in it. */
function createNewIn(entries) {
  const versions = [
    ...new Set(entries.map((entry) => entry.since).filter(Boolean)),
  ].toSorted(compareVersions);
  const version = versions.at(-1);

  if (!version) {
    return null;
  }

  return {
    version,
    items: entries
      .filter((entry) => entry.since === version)
      .map(({ name, parent, kind, href }) => ({
        name: parent ? `${parent}.${name}` : name,
        kind,
        href,
      })),
  };
}

function compareVersions(a, b) {
  const pa = a.split(/[.-]/u).map((part) => Number.parseInt(part, 10) || 0);
  const pb = b.split(/[.-]/u).map((part) => Number.parseInt(part, 10) || 0);

  for (let index = 0; index < Math.max(pa.length, pb.length); index += 1) {
    const diff = (pa[index] ?? 0) - (pb[index] ?? 0);

    if (diff !== 0) {
      return diff;
    }
  }

  return a.localeCompare(b);
}

/** One line of plain code text, short enough for a result row. */
function codeText(code) {
  if (!code) {
    return "";
  }

  const text = code
    .map(([part]) => part)
    .join("")
    .replaceAll(/\s+/gu, " ")
    .trim();

  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

function htmlToText(html) {
  return html
    .replaceAll(/<[^>]+>/gu, "")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&")
    .trim();
}
