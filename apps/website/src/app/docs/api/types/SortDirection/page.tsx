import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 692,
  name: "SortDirection",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/SortDirection",
  since: null,
  description: "1 for ascending or -1 for descending.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["SortDirection", "name"],
    [" = ", "pn"],
    ["1", "lit"],
    [" | ", "pn"],
    ["-1", "lit"],
  ],
  comment: {
    summary:
      "<p><code>1</code> for ascending or <code>-1</code> for descending.</p>",
    short: "<code>1</code> for ascending or <code>-1</code> for descending.",
    deprecated: null,
    modifiers: [],
    blocks: [],
  },
  typeParameters: [],
  hierarchy: null,
  signatureSection: null,
  signatures: [],
  sections: [],
  toc: [
    {
      id: "used-by",
      title: "Used by",
      items: [],
    },
  ],
  sources: [
    {
      path: "packages/driver/src/filter.ts",
      line: 184,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/filter.ts#L184",
    },
  ],
  usedBy: [
    {
      name: "FindQueryOptions.sort",
      href: "/docs/api/interfaces/FindQueryOptions#sort",
      kind: "property",
    },
    {
      name: "Sort",
      href: "/docs/api/types/Sort",
      kind: "type-alias",
    },
  ],
};

export const metadata: Metadata = {
  title: page.name,
  description: page.description || undefined,
};

export default function Page() {
  return <ApiReflectionPage page={page} />;
}
