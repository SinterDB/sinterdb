import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page = {
  id: 728,
  name: "PathsMatching",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/PathsMatching",
  description: "The updatable paths whose value type is assignable to TKind.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["PathsMatching", "name"],
    ["<", "pn"],
    ["TDocument", "tp"],
    [" extends ", "kw"],
    ["object", "prim"],
    [", ", "pn"],
    ["TKind", "tp"],
    ["> = {", "pn"],
    ["\n  "],
    ["[", "pn"],
    ["Path", "tp"],
    [" in ", "kw"],
    ["UpdatePaths", "ref", "/docs/api/types/UpdatePaths"],
    ["<", "pn"],
    ["TDocument", "tp"],
    [">]: [", "pn"],
    ["NonNullable", "ref"],
    ["<", "pn"],
    ["FilterPathValue", "ref", "/docs/api/types/FilterPathValue"],
    ["<", "pn"],
    ["TDocument", "tp"],
    [", ", "pn"],
    ["Path", "tp"],
    [">>]", "pn"],
    [" extends ", "kw"],
    ["[", "pn"],
    ["TKind", "tp"],
    ["]", "pn"],
    ["\n    "],
    ["? ", "pn"],
    ["Path", "tp"],
    ["\n    "],
    [": ", "pn"],
    ["never", "prim"],
    [";", "pn"],
    ["\n"],
    ["}[", "pn"],
    ["UpdatePaths", "ref", "/docs/api/types/UpdatePaths"],
    ["<", "pn"],
    ["TDocument", "tp"],
    [">]", "pn"],
  ],
  comment: {
    summary:
      "<p>The updatable paths whose value type is assignable to <code>TKind</code>.</p>",
    short:
      "The updatable paths whose value type is assignable to <code>TKind</code>.",
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
      name: "TKind",
      code: [["TKind", "tp"]],
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
      line: 20,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/update.ts#L20",
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
