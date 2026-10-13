import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page = {
  id: 721,
  name: "ComparablePaths",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/ComparablePaths",
  description:
    "Updatable paths that hold a comparable value, the targets of $min and $max.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["ComparablePaths", "name"],
    ["<", "pn"],
    ["TDocument", "tp"],
    [" extends ", "kw"],
    ["object", "prim"],
    ["> = ", "pn"],
    ["PathsMatching", "ref", "/docs/api/types/PathsMatching"],
    ["<", "pn"],
    ["TDocument", "tp"],
    [", ", "pn"],
    ["ComparableValue", "ref", "/docs/api/types/ComparableValue"],
    [" | ", "pn"],
    ["boolean", "prim"],
    [">", "pn"],
  ],
  comment: {
    summary:
      "<p>Updatable paths that hold a comparable value, the targets of <code>$min</code> and\n<code>$max</code>.</p>",
    short:
      "Updatable paths that hold a comparable value, the targets of <code>$min</code> and <code>$max</code>.",
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
      path: "packages/driver/src/update.ts",
      line: 38,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/update.ts#L38",
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
