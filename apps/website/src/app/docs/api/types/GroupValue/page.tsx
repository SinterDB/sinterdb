import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 242,
  name: "GroupValue",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/GroupValue",
  since: null,
  description:
    'A value in a $group stage: a field reference or a literal. A string that starts with $ names a field of the incoming document ("$age", or "$address.city" for a nested one). A document without the field gives null in a key. Any other value is a literal. There is no way to write a literal string that starts with $.',
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["GroupValue", "name"],
    [" = ", "pn"],
    ["string", "prim"],
    [" | ", "pn"],
    ["number", "prim"],
    [" | ", "pn"],
    ["bigint", "prim"],
    [" | ", "pn"],
    ["boolean", "prim"],
    [" | ", "pn"],
    ["null", "lit"],
    [" | ", "pn"],
    ["Date", "ref"],
    [" | ", "pn"],
    ["Uint8Array", "ref"],
    [" | ", "pn"],
    ["CustomId", "ref", "/docs/api/classes/CustomId"],
  ],
  comment: {
    summary:
      "<p>A value in a <code>$group</code> stage: a field reference or a literal. A string that\nstarts with <code>$</code> names a field of the incoming document (<code>&quot;$age&quot;</code>, or\n<code>&quot;$address.city&quot;</code> for a nested one). A document without the field gives\n<code>null</code> in a key. Any other value is a literal. There is no way to write a\nliteral string that starts with <code>$</code>.</p>",
    short:
      "A value in a <code>$group</code> stage: a field reference or a literal. A string that starts with <code>$</code> names a field of the incoming document (<code>&quot;$age&quot;</code>, or <code>&quot;$address.city&quot;</code> for a nested one). A document without the field gives <code>null</code> in a key. Any other value is a literal. There is no way to write a literal string that starts with <code>$</code>.",
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
      path: "packages/driver/src/aggregation.ts",
      line: 64,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/aggregation.ts#L64",
    },
  ],
  usedBy: [
    {
      name: "GroupAccumulator",
      href: "/docs/api/types/GroupAccumulator",
      kind: "type-alias",
    },
    {
      name: "GroupSpecification",
      href: "/docs/api/interfaces/GroupSpecification",
      kind: "interface",
    },
    {
      name: "GroupSpecification._id",
      href: "/docs/api/interfaces/GroupSpecification#_id",
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
