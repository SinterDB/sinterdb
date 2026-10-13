/**
 * Search and hover-preview data. Kept out of `project.ts` and loaded on
 * demand, so pages don't ship it until someone searches or hovers a type.
 */
export function renderGeneratedSearchTemplate(entries) {
  return `import type { ApiSearchEntry } from "./model";

export const searchIndex: readonly ApiSearchEntry[] = ${JSON.stringify(entries, null, 2)};
`;
}
