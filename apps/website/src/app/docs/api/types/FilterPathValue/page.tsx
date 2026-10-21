import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 775,
  name: "FilterPathValue",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/FilterPathValue",
  since: null,
  description:
    "The type of the value at a dotted field path. A path through an array reads the type of the elements.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["FilterPathValue", "name"],
    ["<", "pn"],
    ["TDocument", "tp"],
    [", ", "pn"],
    ["TPath", "tp"],
    [" extends ", "kw"],
    ["string", "prim"],
    ["> = ", "pn"],
    ["TPath", "tp"],
    [" extends keyof ", "kw"],
    ["TDocument", "tp"],
    ["\n  "],
    ["? ", "pn"],
    ["TDocument", "tp"],
    ["[", "pn"],
    ["TPath", "tp"],
    ["]", "pn"],
    ["\n  "],
    [": ", "pn"],
    ["TPath", "tp"],
    [" extends ", "kw"],
    ["`", "lit"],
    ["${", "pn"],
    ["infer ", "kw"],
    ["THead", "tp"],
    ["}", "pn"],
    [".", "lit"],
    ["${", "pn"],
    ["infer ", "kw"],
    ["TRest", "tp"],
    ["}", "pn"],
    ["`", "lit"],
    ["\n    "],
    ["? ", "pn"],
    ["THead", "tp"],
    [" extends keyof ", "kw"],
    ["TDocument", "tp"],
    ["\n      "],
    ["? ", "pn"],
    ["FilterPathValue", "ref", "/docs/api/types/FilterPathValue"],
    ["<", "pn"],
    ["PathChild", "ref", "/docs/api/types/PathChild"],
    ["<", "pn"],
    ["TDocument", "tp"],
    ["[", "pn"],
    ["THead", "tp"],
    ["]>, ", "pn"],
    ["TRest", "tp"],
    [">", "pn"],
    ["\n      "],
    [": ", "pn"],
    ["never", "prim"],
    ["\n    "],
    [": ", "pn"],
    ["never", "prim"],
  ],
  comment: {
    summary:
      "<p>The type of the value at a dotted field path. A path through an array reads\nthe type of the elements.</p>",
    short:
      "The type of the value at a dotted field path. A path through an array reads the type of the elements.",
    deprecated: null,
    modifiers: [],
    blocks: [],
  },
  typeParameters: [
    {
      name: "TDocument",
      code: [["TDocument", "tp"]],
      comment: null,
    },
    {
      name: "TPath",
      code: [
        ["TPath", "tp"],
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
      path: "packages/driver/src/filter.ts",
      line: 152,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/filter.ts#L152",
    },
  ],
  usedBy: [
    {
      name: "DistinctValue",
      href: "/docs/api/types/DistinctValue",
      kind: "type-alias",
    },
    {
      name: "Filter",
      href: "/docs/api/types/Filter",
      kind: "type-alias",
    },
    {
      name: "PathsMatching",
      href: "/docs/api/types/PathsMatching",
      kind: "type-alias",
    },
    {
      name: "UpdateFilter",
      href: "/docs/api/types/UpdateFilter",
      kind: "type-alias",
    },
    {
      name: "UpdateFilter.$addToSet",
      href: "/docs/api/types/UpdateFilter#add-to-set",
      kind: "property",
    },
    {
      name: "UpdateFilter.$inc",
      href: "/docs/api/types/UpdateFilter#inc",
      kind: "property",
    },
    {
      name: "UpdateFilter.$max",
      href: "/docs/api/types/UpdateFilter#max",
      kind: "property",
    },
    {
      name: "UpdateFilter.$min",
      href: "/docs/api/types/UpdateFilter#min",
      kind: "property",
    },
    {
      name: "UpdateFilter.$pull",
      href: "/docs/api/types/UpdateFilter#pull",
      kind: "property",
    },
    {
      name: "UpdateFilter.$push",
      href: "/docs/api/types/UpdateFilter#push",
      kind: "property",
    },
    {
      name: "UpdateFilter.$set",
      href: "/docs/api/types/UpdateFilter#set",
      kind: "property",
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
