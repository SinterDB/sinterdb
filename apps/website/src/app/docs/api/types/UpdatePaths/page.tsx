import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 839,
  name: "UpdatePaths",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/UpdatePaths",
  since: null,
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
    ["FieldPaths", "ref", "/docs/api/types/FieldPaths"],
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
  toc: [
    {
      id: "used-by",
      title: "Used by",
      items: [],
    },
  ],
  sources: [
    {
      path: "packages/driver/src/update.ts",
      line: 14,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/update.ts#L14",
    },
  ],
  usedBy: [
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
      name: "UpdateFilter.$set",
      href: "/docs/api/types/UpdateFilter#set",
      kind: "property",
    },
    {
      name: "UpdateFilter.$unset",
      href: "/docs/api/types/UpdateFilter#unset",
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
