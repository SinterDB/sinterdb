import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 330,
  name: "EqualityFilter",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/EqualityFilter",
  since: null,
  description: "A shorthand filter that matches fields by equality only.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["EqualityFilter", "name"],
    ["<", "pn"],
    ["TDocument", "tp"],
    [" extends ", "kw"],
    ["object", "prim"],
    ["> = { ", "pn"],
    ["readonly ", "kw"],
    ["[", "pn"],
    ["Key", "tp"],
    [" in keyof ", "kw"],
    ["TDocument", "tp"],
    ["]?: ", "pn"],
    ["TDocument", "tp"],
    ["[", "pn"],
    ["Key", "tp"],
    ["] }", "pn"],
  ],
  comment: {
    summary: "<p>A shorthand filter that matches fields by equality only.</p>",
    short: "A shorthand filter that matches fields by equality only.",
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
      path: "packages/driver/src/collection.ts",
      line: 60,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/collection.ts#L60",
    },
  ],
  usedBy: [],
};

export const metadata: Metadata = {
  title: page.name,
  description: page.description || undefined,
};

export default function Page() {
  return <ApiReflectionPage page={page} />;
}
