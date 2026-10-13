import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page = {
  id: 657,
  name: "Sort",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/Sort",
  description:
    "A sort order: [path, direction] pairs, where earlier pairs take priority.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["Sort", "name"],
    ["<", "pn"],
    ["TDocument", "tp"],
    [" extends ", "kw"],
    ["object", "prim"],
    ["> = ", "pn"],
    ["readonly ", "kw"],
    ["(", "pn"],
    ["readonly ", "kw"],
    ["[", "pn"],
    ["path", "param"],
    [": ", "pn"],
    ["FilterPaths", "ref", "/docs/api/types/FilterPaths"],
    ["<", "pn"],
    ["TDocument", "tp"],
    ["> | ", "pn"],
    ['"_id"', "lit"],
    [", ", "pn"],
    ["direction", "param"],
    [": ", "pn"],
    ["SortDirection", "ref", "/docs/api/types/SortDirection"],
    ["])[]", "pn"],
  ],
  comment: {
    summary:
      "<p>A sort order: <code>[path, direction]</code> pairs, where earlier pairs take priority.</p>",
    short:
      "A sort order: <code>[path, direction]</code> pairs, where earlier pairs take priority.",
    deprecated: null,
    modifiers: [],
    blocks: [],
  },
  typeParameters: [
    {
      name: "TDocument",
      code: [
        ["TDocument", "tp"],
        [" extends ", "kw"],
        ["object", "prim"],
      ],
      comment: null,
    },
  ],
  hierarchy: null,
  signatureSection: null,
  signatures: [],
  sections: [],
  toc: [],
  sources: [
    {
      path: "packages/driver/src/filter.ts",
      line: 124,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/filter.ts#L124",
    },
  ],
} satisfies ApiPage;

export const metadata: Metadata = {
  title: page.name,
  description: page.description || undefined,
};

export default function Page() {
  return <ApiReflectionPage page={page} />;
}
