import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 336,
  name: "CursorExecutor",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/CursorExecutor",
  since: null,
  description:
    "The function a FindCursor uses to reach the server. Cursors are created by SinterCollection.find; do not construct them directly.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["CursorExecutor", "name"],
    [" = (", "pn"],
    ["command", "param"],
    [": ", "pn"],
    ["string", "prim"],
    [", ", "pn"],
    ["parameters", "param"],
    [": ", "pn"],
    ["Document", "ref", "/docs/api/interfaces/Document"],
    [") => ", "pn"],
    ["Promise", "ref"],
    ["<", "pn"],
    ["DocumentValue", "ref"],
    [">", "pn"],
  ],
  comment: {
    summary:
      '<p>The function a <a href="/docs/api/classes/FindCursor">FindCursor</a> uses to reach the server. Cursors are\ncreated by <a href="/docs/api/classes/SinterCollection#find">SinterCollection.find</a>; do not construct them directly.</p>',
    short:
      'The function a <a href="/docs/api/classes/FindCursor">FindCursor</a> uses to reach the server. Cursors are created by <a href="/docs/api/classes/SinterCollection#find">SinterCollection.find</a>; do not construct them directly.',
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
      path: "packages/driver/src/cursor.ts",
      line: 12,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L12",
    },
  ],
  usedBy: [
    {
      name: "FindCursor.constructor",
      href: "/docs/api/classes/FindCursor#constructor",
      kind: "constructor",
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
