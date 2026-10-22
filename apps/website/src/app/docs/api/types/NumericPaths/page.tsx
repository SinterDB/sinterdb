import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 863,
  name: "NumericPaths",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/NumericPaths",
  since: null,
  description:
    "Updatable paths that hold a number or bigint, the targets of $inc.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["NumericPaths", "name"],
    ["<", "pn"],
    ["TDocument", "tp"],
    [" extends ", "kw"],
    ["object", "prim"],
    ["> = ", "pn"],
    ["PathsMatching", "ref", "/docs/api/types/PathsMatching"],
    ["<", "pn"],
    ["TDocument", "tp"],
    [", ", "pn"],
    ["number", "prim"],
    [" | ", "pn"],
    ["bigint", "prim"],
    [">", "pn"],
  ],
  comment: {
    summary:
      "<p>Updatable paths that hold a number or bigint, the targets of <code>$inc</code>.</p>",
    short:
      "Updatable paths that hold a number or bigint, the targets of <code>$inc</code>.",
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
      line: 29,
      url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/update.ts#L29",
    },
  ],
  usedBy: [
    {
      name: "UpdateFilter",
      href: "/docs/api/types/UpdateFilter",
      kind: "type-alias",
    },
    {
      name: "UpdateFilter.$inc",
      href: "/docs/api/types/UpdateFilter#inc",
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
