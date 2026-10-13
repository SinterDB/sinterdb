import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 656,
  name: "MaxPathDepth",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/MaxPathDepth",
  since: null,
  description:
    "How many levels of nesting the compiler follows when it builds field paths. Deeper paths still work at runtime but are not suggested or type-checked.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["MaxPathDepth", "name"],
    [" = ", "pn"],
    ["5", "lit"],
  ],
  comment: {
    summary:
      "<p>How many levels of nesting the compiler follows when it builds field paths.\nDeeper paths still work at runtime but are not suggested or type-checked.</p>",
    short:
      "How many levels of nesting the compiler follows when it builds field paths. Deeper paths still work at runtime but are not suggested or type-checked.",
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
      line: 63,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/filter.ts#L63",
    },
  ],
  usedBy: [
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
