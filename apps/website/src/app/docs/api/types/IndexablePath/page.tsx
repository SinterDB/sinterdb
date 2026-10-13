import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page = {
  id: 673,
  name: "IndexablePath",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/IndexablePath",
  description:
    "Field paths that can be indexed: every known path except _id, which always has its own unique index.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["IndexablePath", "name"],
    ["<", "pn"],
    ["TDocument", "tp"],
    [" extends ", "kw"],
    ["object", "prim"],
    ["> = ", "pn"],
    ["Exclude", "ref"],
    ["<", "pn"],
    ["FilterPaths", "ref", "/docs/api/types/FilterPaths"],
    ["<", "pn"],
    ["TDocument", "tp"],
    [">, ", "pn"],
    ['"_id"', "lit"],
    [" | ", "pn"],
    ["`_id.", "lit"],
    ["${", "pn"],
    ["string", "prim"],
    ["}", "pn"],
    ["`", "lit"],
    [">", "pn"],
  ],
  comment: {
    summary:
      "<p>Field paths that can be indexed: every known path except <code>_id</code>, which\nalways has its own unique index.</p>",
    short:
      "Field paths that can be indexed: every known path except <code>_id</code>, which always has its own unique index.",
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
      path: "packages/driver/src/indexes.ts",
      line: 10,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L10",
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
