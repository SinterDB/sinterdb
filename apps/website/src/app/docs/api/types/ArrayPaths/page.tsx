import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page = {
  id: 719,
  name: "ArrayPaths",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/ArrayPaths",
  description:
    "Updatable paths that hold an array, the targets of $push, $addToSet and $pull.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["ArrayPaths", "name"],
    ["<", "pn"],
    ["TDocument", "tp"],
    [" extends ", "kw"],
    ["object", "prim"],
    ["> = ", "pn"],
    ["PathsMatching", "ref", "/docs/api/types/PathsMatching"],
    ["<", "pn"],
    ["TDocument", "tp"],
    [", ", "pn"],
    ["readonly ", "kw"],
    ["unknown", "prim"],
    ["[]>", "pn"],
  ],
  comment: {
    summary:
      "<p>Updatable paths that hold an array, the targets of <code>$push</code>, <code>$addToSet</code> and\n<code>$pull</code>.</p>",
    short:
      "Updatable paths that hold an array, the targets of <code>$push</code>, <code>$addToSet</code> and <code>$pull</code>.",
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
      line: 47,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/update.ts#L47",
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
