import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 779,
  name: "PathChild",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/PathChild",
  since: null,
  description:
    "What a dotted path steps into: the value itself, or the elements of an array. items.sku is a valid path when items is an array of documents.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["PathChild", "name"],
    ["<", "pn"],
    ["TValue", "tp"],
    ["> = ", "pn"],
    ["NonNullable", "ref"],
    ["<", "pn"],
    ["ElementOf", "ref", "/docs/api/types/ElementOf"],
    ["<", "pn"],
    ["NonNullable", "ref"],
    ["<", "pn"],
    ["TValue", "tp"],
    [">>>", "pn"],
  ],
  comment: {
    summary:
      "<p>What a dotted path steps into: the value itself, or the elements of an\narray. <code>items.sku</code> is a valid path when <code>items</code> is an array of documents.</p>",
    short:
      "What a dotted path steps into: the value itself, or the elements of an array. <code>items.sku</code> is a valid path when <code>items</code> is an array of documents.",
    deprecated: null,
    modifiers: [],
    blocks: [],
  },
  typeParameters: [
    {
      name: "TValue",
      code: [["TValue", "tp"]],
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
      path: "packages/driver/src/filter.ts",
      line: 100,
      url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/filter.ts#L100",
    },
  ],
  usedBy: [
    {
      name: "FilterPaths",
      href: "/docs/api/types/FilterPaths",
      kind: "type-alias",
    },
    {
      name: "FilterPathValue",
      href: "/docs/api/types/FilterPathValue",
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
