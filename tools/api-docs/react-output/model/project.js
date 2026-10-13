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

  const groups = (project.groups ?? [])
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
          };
        }),
    }))
    .filter((group) => group.items.length > 0);

  const projectComment = createCommentModel(project.comment, ctx);

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
    hierarchy: ctx.options.features.hierarchy ? createHierarchyForest(ctx) : [],
    pages: ctx.pages.map((plan) => ({
      route: plan.route,
      page: createPageModel(plan, ctx),
    })),
  };
}
