import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page = {
  id: 726,
  name: "NumericPaths",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/NumericPaths",
  description:
    "Updatable paths that hold a number or bigint, the targets of $inc.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["NumericPaths", "name"],
    ["<", "pn"],
    ["TDocument", "tp"],
    [" extends ", "kw"],
    ["object", "prim"],
    ["> = ", "pn"],
    ["PathsMatching", "ref", "/docs/api/types/PathsMatching"],
    ["<", "pn"],
    ["TDocument", "tp"],
    [", ", "pn"],
    ["number", "prim"],
    [" | ", "pn"],
    ["bigint", "prim"],
    [">", "pn"],
  ],
  comment: {
    summary:
      "<p>Updatable paths that hold a number or bigint, the targets of <code>$inc</code>.</p>",
    short:
      "Updatable paths that hold a number or bigint, the targets of <code>$inc</code>.",
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
      line: 29,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/update.ts#L29",
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
