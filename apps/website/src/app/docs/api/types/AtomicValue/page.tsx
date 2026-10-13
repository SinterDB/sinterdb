import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page = {
  id: 623,
  name: "AtomicValue",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/AtomicValue",
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
  toc: [],
  sources: [
    {
      path: "packages/driver/src/filter.ts",
      line: 11,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/filter.ts#L11",
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
