import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page = {
  id: 632,
  name: "ElementOf",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/ElementOf",
  description:
    "The element type of an array type, or the type itself when it is not an array.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["ElementOf", "name"],
    ["<", "pn"],
    ["TValue", "tp"],
    ["> = ", "pn"],
    ["TValue", "tp"],
    [" extends readonly infer ", "kw"],
    ["TElement", "tp"],
    ["[] ? ", "pn"],
    ["TElement", "tp"],
    [" : ", "pn"],
    ["TValue", "tp"],
  ],
  comment: {
    summary:
      "<p>The element type of an array type, or the type itself when it is not an\narray.</p>",
    short:
      "The element type of an array type, or the type itself when it is not an array.",
    deprecated: null,
    modifiers: [],
    blocks: [],
  },
  typeParameters: [
    {
      name: "TValue",
      code: [["TValue", "tp"]],
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
      line: 17,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/filter.ts#L17",
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
