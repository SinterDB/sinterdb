import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 749,
  name: "ElementMatch",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/ElementMatch",
  since: null,
  description:
    "What $elemMatch accepts for an array whose elements have this type.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["ElementMatch", "name"],
    ["<", "pn"],
    ["TElement", "tp"],
    ["> = [", "pn"],
    ["Extract", "ref"],
    ["<", "pn"],
    ["TElement", "tp"],
    [", ", "pn"],
    ["AtomicValue", "ref", "/docs/api/types/AtomicValue"],
    [">]", "pn"],
    [" extends ", "kw"],
    ["[", "pn"],
    ["never", "prim"],
    ["]", "pn"],
    ["\n  "],
    ["? ", "pn"],
    ["TElement", "tp"],
    [" extends ", "kw"],
    ["object", "prim"],
    [" ? ", "pn"],
    ["Filter", "ref", "/docs/api/types/Filter"],
    ["<", "pn"],
    ["TElement", "tp"],
    ["> : ", "pn"],
    ["never", "prim"],
    ["\n  "],
    [": ", "pn"],
    ["FilterOperators", "ref", "/docs/api/types/FilterOperators"],
    ["<", "pn"],
    ["TElement", "tp"],
    [">", "pn"],
  ],
  comment: {
    summary:
      "<p>What <code>$elemMatch</code> accepts for an array whose elements have this type.</p>",
    short:
      "What <code>$elemMatch</code> accepts for an array whose elements have this type.",
    deprecated: null,
    modifiers: [],
    blocks: [],
  },
  typeParameters: [
    {
      name: "TElement",
      code: [["TElement", "tp"]],
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
      line: 61,
      url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/filter.ts#L61",
    },
  ],
  usedBy: [
    {
      name: "ArrayOperators",
      href: "/docs/api/types/ArrayOperators",
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
