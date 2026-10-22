import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 327,
  name: "DistinctValue",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/DistinctValue",
  since: null,
  description:
    "The type of one value returned by SinterCollection.distinct for a field: the element type when the field holds an array.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["DistinctValue", "name"],
    ["<", "pn"],
    ["TDocument", "tp"],
    [" extends ", "kw"],
    ["object", "prim"],
    [", ", "pn"],
    ["TField", "tp"],
    [" extends ", "kw"],
    ["string", "prim"],
    ["> = ", "pn"],
    ["TField", "tp"],
    [" extends ", "kw"],
    ['"_id"', "lit"],
    ["\n  "],
    ["? ", "pn"],
    ["CustomId", "ref", "/docs/api/classes/CustomId"],
    ["\n  "],
    [": ", "pn"],
    ["Exclude", "ref"],
    ["<", "pn"],
    ["ElementOf", "ref", "/docs/api/types/ElementOf"],
    ["<", "pn"],
    ["FilterPathValue", "ref", "/docs/api/types/FilterPathValue"],
    ["<", "pn"],
    ["TDocument", "tp"],
    [", ", "pn"],
    ["TField", "tp"],
    [">>, ", "pn"],
    ["undefined", "prim"],
    [">", "pn"],
  ],
  comment: {
    summary:
      '<p>The type of one value returned by <a href="/docs/api/classes/SinterCollection#distinct">SinterCollection.distinct</a> for a\nfield: the element type when the field holds an array.</p>',
    short:
      'The type of one value returned by <a href="/docs/api/classes/SinterCollection#distinct">SinterCollection.distinct</a> for a field: the element type when the field holds an array.',
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
    {
      name: "TField",
      code: [
        ["TField", "tp"],
        [" extends ", "kw"],
        ["string", "prim"],
      ],
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
      path: "packages/driver/src/collection.ts",
      line: 68,
      url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/collection.ts#L68",
    },
  ],
  usedBy: [
    {
      name: "SinterCollection.distinct",
      href: "/docs/api/classes/SinterCollection#distinct",
      kind: "method",
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
