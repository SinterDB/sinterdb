import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 608,
  name: "SinterErrorCode",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/SinterErrorCode",
  since: null,
  description: "A value of SinterErrorCode.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["SinterErrorCode", "name"],
    [" = ", "pn"],
    ["typeof ", "kw"],
    ["SinterErrorCode", "ref", "/docs/api/variables/SinterErrorCode"],
    ["[", "pn"],
    ["keyof typeof ", "kw"],
    ["SinterErrorCode", "ref", "/docs/api/variables/SinterErrorCode"],
    ["]", "pn"],
  ],
  comment: {
    summary:
      '<p>A value of <a href="/docs/api/variables/SinterErrorCode">SinterErrorCode</a>.</p>',
    short:
      'A value of <a href="/docs/api/variables/SinterErrorCode">SinterErrorCode</a>.',
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
      path: "packages/driver/src/errors.ts",
      line: 7,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L7",
    },
    {
      path: "packages/driver/src/errors.ts",
      line: 35,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L35",
    },
  ],
  usedBy: [
    {
      name: "SinterClientOptionsError.code",
      href: "/docs/api/classes/SinterClientOptionsError#code",
      kind: "property",
    },
    {
      name: "SinterClientStateError.code",
      href: "/docs/api/classes/SinterClientStateError#code",
      kind: "property",
    },
    {
      name: "SinterConnectionError.code",
      href: "/docs/api/classes/SinterConnectionError#code",
      kind: "property",
    },
    {
      name: "SinterConnectionStringError.code",
      href: "/docs/api/classes/SinterConnectionStringError#code",
      kind: "property",
    },
    {
      name: "SinterDocumentError.code",
      href: "/docs/api/classes/SinterDocumentError#code",
      kind: "property",
    },
    {
      name: "SinterError.code",
      href: "/docs/api/classes/SinterError#code",
      kind: "property",
    },
    {
      name: "SinterError.constructor",
      href: "/docs/api/classes/SinterError#constructor",
      kind: "constructor",
    },
    {
      name: "SinterInsertManyError.code",
      href: "/docs/api/classes/SinterInsertManyError#code",
      kind: "property",
    },
    {
      name: "SinterNamespaceError.code",
      href: "/docs/api/classes/SinterNamespaceError#code",
      kind: "property",
    },
    {
      name: "SinterProtocolError.code",
      href: "/docs/api/classes/SinterProtocolError#code",
      kind: "property",
    },
    {
      name: "SinterRequestTimeoutError.code",
      href: "/docs/api/classes/SinterRequestTimeoutError#code",
      kind: "property",
    },
    {
      name: "SinterServerError.code",
      href: "/docs/api/classes/SinterServerError#code",
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
