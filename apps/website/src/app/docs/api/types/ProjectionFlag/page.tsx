import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 310,
  name: "ProjectionFlag",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/ProjectionFlag",
  since: null,
  description: "1 or true keeps a field; 0 or false removes it.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["ProjectionFlag", "name"],
    [" = ", "pn"],
    ["0", "lit"],
    [" | ", "pn"],
    ["1", "lit"],
    [" | ", "pn"],
    ["boolean", "prim"],
  ],
  comment: {
    summary:
      "<p><code>1</code> or <code>true</code> keeps a field; <code>0</code> or <code>false</code> removes it.</p>",
    short:
      "<code>1</code> or <code>true</code> keeps a field; <code>0</code> or <code>false</code> removes it.",
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
      path: "packages/driver/src/projection.ts",
      line: 7,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/projection.ts#L7",
    },
  ],
  usedBy: [
    {
      name: "Projection",
      href: "/docs/api/types/Projection",
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
