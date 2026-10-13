import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page = {
  id: 624,
  name: "ComparableValue",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/ComparableValue",
  description: "Values that can be compared with $gt, $gte, $lt and $lte.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["ComparableValue", "name"],
    [" = ", "pn"],
    ["string", "prim"],
    [" | ", "pn"],
    ["number", "prim"],
    [" | ", "pn"],
    ["bigint", "prim"],
    [" | ", "pn"],
    ["Date", "ref"],
    [" | ", "pn"],
    ["Uint8Array", "ref"],
    [" | ", "pn"],
    ["CustomId", "ref", "/docs/api/classes/CustomId"],
  ],
  comment: {
    summary:
      "<p>Values that can be compared with <code>$gt</code>, <code>$gte</code>, <code>$lt</code> and <code>$lte</code>.</p>",
    short:
      "Values that can be compared with <code>$gt</code>, <code>$gte</code>, <code>$lt</code> and <code>$lte</code>.",
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
      line: 4,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/filter.ts#L4",
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
