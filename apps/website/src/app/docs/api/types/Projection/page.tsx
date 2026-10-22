import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 368,
  name: "Projection",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/Projection",
  since: null,
  description: "Which fields a query returns, as field paths mapped to a flag.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["Projection", "name"],
    ["<", "pn"],
    ["TDocument", "tp"],
    [" extends ", "kw"],
    ["object", "prim"],
    ["> = { ", "pn"],
    ["readonly ", "kw"],
    ["[", "pn"],
    ["Path", "tp"],
    [" in ", "kw"],
    ["FilterPaths", "ref", "/docs/api/types/FilterPaths"],
    ["<", "pn"],
    ["TDocument", "tp"],
    ["> | ", "pn"],
    ['"_id"', "lit"],
    ["]?: ", "pn"],
    ["ProjectionFlag", "ref", "/docs/api/types/ProjectionFlag"],
    [" }", "pn"],
  ],
  comment: {
    summary:
      "<p>Which fields a query returns, as field paths mapped to a flag.</p>\n<ul>\n<li><code>{ name: 1, &quot;address.city&quot;: 1 }</code> returns only those fields (and <code>_id</code>).</li>\n<li><code>{ passwordHash: 0 }</code> returns everything except those fields.</li>\n<li><code>_id</code> is returned unless it is set to <code>0</code>, and it is the one field that may\ndiffer from the rest: <code>{ name: 1, _id: 0 }</code> is valid.</li>\n<li>Inclusion and exclusion cannot be mixed for any other field.</li>\n</ul>\n<p>Pass the projection inline, or declare it <code>as const</code>, so the result type can\nbe worked out from it.</p>",
    short: "Which fields a query returns, as field paths mapped to a flag.",
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
      path: "packages/driver/src/projection.ts",
      line: 21,
      url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/projection.ts#L21",
    },
  ],
  usedBy: [
    {
      name: "AggregationStage",
      href: "/docs/api/types/AggregationStage",
      kind: "type-alias",
    },
    {
      name: "FindOneOptions",
      href: "/docs/api/interfaces/FindOneOptions",
      kind: "interface",
    },
    {
      name: "FindOptions",
      href: "/docs/api/interfaces/FindOptions",
      kind: "interface",
    },
    {
      name: "SinterCollection.find",
      href: "/docs/api/classes/SinterCollection#find",
      kind: "method",
    },
    {
      name: "SinterCollection.findOne",
      href: "/docs/api/classes/SinterCollection#find-one",
      kind: "method",
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
