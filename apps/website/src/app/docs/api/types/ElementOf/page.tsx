import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 660,
  name: "ElementOf",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/ElementOf",
  since: null,
  description:
    "The element type of an array type, or the type itself when it is not an array.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["ElementOf", "name"],
    ["<", "pn"],
    ["TValue", "tp"],
    ["> = ", "pn"],
    ["TValue", "tp"],
    [" extends readonly infer ", "kw"],
    ["TElement", "tp"],
    ["[] ? ", "pn"],
    ["TElement", "tp"],
    [" : ", "pn"],
    ["TValue", "tp"],
  ],
  comment: {
    summary:
      "<p>The element type of an array type, or the type itself when it is not an\narray.</p>",
    short:
      "The element type of an array type, or the type itself when it is not an array.",
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
      line: 17,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/filter.ts#L17",
    },
  ],
  usedBy: [
    {
      name: "ArrayOperators",
      href: "/docs/api/types/ArrayOperators",
      kind: "type-alias",
    },
    {
      name: "ComparisonOperators",
      href: "/docs/api/types/ComparisonOperators",
      kind: "type-alias",
    },
    {
      name: "Filter",
      href: "/docs/api/types/Filter",
      kind: "type-alias",
    },
    {
      name: "FilterOperators",
      href: "/docs/api/types/FilterOperators",
      kind: "type-alias",
    },
    {
      name: "FilterOperators.$eq",
      href: "/docs/api/types/FilterOperators#eq",
      kind: "property",
    },
    {
      name: "FilterOperators.$in",
      href: "/docs/api/types/FilterOperators#in",
      kind: "property",
    },
    {
      name: "FilterOperators.$ne",
      href: "/docs/api/types/FilterOperators#ne",
      kind: "property",
    },
    {
      name: "FilterOperators.$nin",
      href: "/docs/api/types/FilterOperators#nin",
      kind: "property",
    },
    {
      name: "PathChild",
      href: "/docs/api/types/PathChild",
      kind: "type-alias",
    },
    {
      name: "UpdateFilter",
      href: "/docs/api/types/UpdateFilter",
      kind: "type-alias",
    },
    {
      name: "UpdateFilter.$addToSet",
      href: "/docs/api/types/UpdateFilter#add-to-set",
      kind: "property",
    },
    {
      name: "UpdateFilter.$pull",
      href: "/docs/api/types/UpdateFilter#pull",
      kind: "property",
    },
    {
      name: "UpdateFilter.$push",
      href: "/docs/api/types/UpdateFilter#push",
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
