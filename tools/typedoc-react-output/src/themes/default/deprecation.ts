import type { ApiDeprecation } from "../_generated/model";
import { project } from "../_generated/project";

const byHref = new Map(project.deprecated.map((item) => [item.href, item]));

/** The deprecation behind a link, if it points at a deprecated API. */
export function deprecationOf(href: string | null | undefined) {
  return href ? (byHref.get(href) ?? null) : null;
}

/** Tooltip for anything pointing at a deprecated API. */
export function deprecationTitle(deprecation: ApiDeprecation) {
  const owner = deprecation.inheritedFrom
    ? ` (${deprecation.inheritedFrom} is deprecated)`
    : "";

  return deprecation.reason
    ? `Deprecated${owner}: ${deprecation.reason}`
    : `Deprecated${owner}`;
}
