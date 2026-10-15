import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 662,
  name: "AtomicValue",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/AtomicValue",
  since: null,
  description:
    "Values that can be matched by equality: comparable values, booleans and null.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["AtomicValue", "name"],
    [" = ", "pn"],
    ["ComparableValue", "ref", "/docs/api/types/ComparableValue"],
    [" | ", "pn"],
    ["boolean", "prim"],
    [" | ", "pn"],
    ["null", "lit"],
  ],
  comment: {
    summary:
      "<p>Values that can be matched by equality: comparable values, booleans and\n<code>null</code>.</p>",
    short:
      "Values that can be matched by equality: comparable values, booleans and <code>null</code>.",
    deprecated: null,
    modifiers: [],
    blocks: [],
  },
  typeParameters: [],
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
      line: 11,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/filter.ts#L11",
    },
  ],
  usedBy: [
    {
      name: "ElementMatch",
      href: "/docs/api/types/ElementMatch",
      kind: "type-alias",
    },
    {
      name: "FieldPaths",
      href: "/docs/api/types/FieldPaths",
      kind: "type-alias",
    },
    {
      name: "FilterPaths",
      href: "/docs/api/types/FilterPaths",
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
