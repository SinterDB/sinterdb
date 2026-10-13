import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page = {
  id: 744,
  name: "UpdatePaths",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/UpdatePaths",
  description:
    "The field paths an update can change: every path except _id, which is immutable.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["UpdatePaths", "name"],
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
      "<p>The field paths an update can change: every path except <code>_id</code>, which is\nimmutable.</p>",
    short:
      "The field paths an update can change: every path except <code>_id</code>, which is immutable.",
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
      line: 14,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/update.ts#L14",
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
