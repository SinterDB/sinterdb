import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page = {
  id: 625,
  name: "ComparisonOperators",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/ComparisonOperators",
  description:
    "The range operators $gt, $gte, $lt and $lte. They are available only when the value type includes a comparable type.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["ComparisonOperators", "name"],
    ["<", "pn"],
    ["TValue", "tp"],
    ["> = [", "pn"],
    ["Extract", "ref"],
    ["<", "pn"],
    ["TValue", "tp"],
    [", ", "pn"],
    ["ComparableValue", "ref", "/docs/api/types/ComparableValue"],
    [">]", "pn"],
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
    ["$gt", "prop"],
    ["?: ", "pn"],
    ["Extract", "ref"],
    ["<", "pn"],
    ["TValue", "tp"],
    [", ", "pn"],
    ["ComparableValue", "ref", "/docs/api/types/ComparableValue"],
    [">;", "pn"],
    ["\n    "],
    ["readonly ", "kw"],
    ["$gte", "prop"],
    ["?: ", "pn"],
    ["Extract", "ref"],
    ["<", "pn"],
    ["TValue", "tp"],
    [", ", "pn"],
    ["ComparableValue", "ref", "/docs/api/types/ComparableValue"],
    [">;", "pn"],
    ["\n    "],
    ["readonly ", "kw"],
    ["$lt", "prop"],
    ["?: ", "pn"],
    ["Extract", "ref"],
    ["<", "pn"],
    ["TValue", "tp"],
    [", ", "pn"],
    ["ComparableValue", "ref", "/docs/api/types/ComparableValue"],
    [">;", "pn"],
    ["\n    "],
    ["readonly ", "kw"],
    ["$lte", "prop"],
    ["?: ", "pn"],
    ["Extract", "ref"],
    ["<", "pn"],
    ["TValue", "tp"],
    [", ", "pn"],
    ["ComparableValue", "ref", "/docs/api/types/ComparableValue"],
    [">;", "pn"],
    ["\n  "],
    ["}", "pn"],
  ],
  comment: {
    summary:
      "<p>The range operators <code>$gt</code>, <code>$gte</code>, <code>$lt</code> and <code>$lte</code>. They are available\nonly when the value type includes a comparable type.</p>",
    short:
      "The range operators <code>$gt</code>, <code>$gte</code>, <code>$lt</code> and <code>$lte</code>. They are available only when the value type includes a comparable type.",
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
      line: 25,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/filter.ts#L25",
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
