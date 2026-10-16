/**
 * Guide navigation: the sidebar, the section label above each page title and
 * the previous/next links all come from this list. Adding a page is
 * `src/app/docs/(guides)/<slug>/page.mdx` plus an entry here.
 *
 * `soon: true` keeps a planned page visible in the sidebar without linking
 * to a 404.
 */
export interface DocsNavItem {
  readonly label: string;
  readonly href: string;
  readonly soon?: boolean;
}

export interface DocsNavSection {
  readonly title: string;
  readonly items: readonly DocsNavItem[];
}

export const docsNav: readonly DocsNavSection[] = [
  {
    title: "Getting Started",
    items: [
      { label: "Introduction", href: "/docs" },
      { label: "Installation", href: "/docs/installation" },
      { label: "Connecting", href: "/docs/connecting" },
    ],
  },
  {
    title: "Core",
    items: [
      { label: "Databases", href: "/docs/databases" },
      { label: "Collections", href: "/docs/collections" },
      { label: "Documents", href: "/docs/documents" },
    ],
  },
  {
    title: "Queries",
    items: [
      { label: "Filters", href: "/docs/filters" },
      { label: "Sorting", href: "/docs/sorting" },
      { label: "Cursors", href: "/docs/cursors" },
    ],
  },
  {
    title: "Writing Data",
    items: [
      { label: "Inserts", href: "/docs/inserts" },
      { label: "Updates", href: "/docs/updates" },
      { label: "Replacements", href: "/docs/replacements" },
      { label: "Deletes", href: "/docs/deletes" },
    ],
  },
];

export const docsPages = docsNav.flatMap((section) =>
  section.items
    .filter((item) => !item.soon)
    .map((item) => ({ ...item, section: section.title })),
);

export function findDocsPage(pathname: string) {
  const index = docsPages.findIndex((page) => page.href === pathname);

  return {
    page: docsPages[index] ?? null,
    previous: index > 0 ? docsPages[index - 1] : null,
    next: index >= 0 ? (docsPages[index + 1] ?? null) : null,
  };
}
