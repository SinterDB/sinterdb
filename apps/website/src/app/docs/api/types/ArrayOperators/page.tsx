import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 623,
  name: "ArrayOperators",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/ArrayOperators",
  since: null,
  description:
    "What a filter can say about the elements of an array: $size and $elemMatch. They are available only when the value type is an array.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["ArrayOperators", "name"],
    ["<", "pn"],
    ["TValue", "tp"],
    ["> = [", "pn"],
    ["Extract", "ref"],
    ["<", "pn"],
    ["TValue", "tp"],
    [", ", "pn"],
    ["readonly ", "kw"],
    ["unknown", "prim"],
    ["[]>]", "pn"],
    [" extends ", "kw"],
    ["[", "pn"],
    ["never", "prim"],
    ["]", "pn"],
    ["\n  "],
    ["? ", "pn"],
    ["unknown", "prim"],
    ["\n  "],
    [": {", "pn"],
    ["\n    "],
    ["readonly ", "kw"],
    ["$elemMatch", "prop"],
    ["?: ", "pn"],
    ["ElementMatch", "ref", "/docs/api/types/ElementMatch"],
    ["<", "pn"],
    ["ElementOf", "ref", "/docs/api/types/ElementOf"],
    ["<", "pn"],
    ["Extract", "ref"],
    ["<", "pn"],
    ["TValue", "tp"],
    [", ", "pn"],
    ["readonly ", "kw"],
    ["unknown", "prim"],
    ["[]>>>;", "pn"],
    ["\n    "],
    ["readonly ", "kw"],
    ["$size", "prop"],
    ["?: ", "pn"],
    ["number", "prim"],
    [";", "pn"],
    ["\n  "],
    ["}", "pn"],
  ],
  comment: {
    summary:
      "<p>What a filter can say about the elements of an array: <code>$size</code> and\n<code>$elemMatch</code>. They are available only when the value type is an array.</p>",
    short:
      "What a filter can say about the elements of an array: <code>$size</code> and <code>$elemMatch</code>. They are available only when the value type is an array.",
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
      line: 44,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/filter.ts#L44",
    },
  ],
  usedBy: [
    {
      name: "FilterOperators",
      href: "/docs/api/types/FilterOperators",
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
