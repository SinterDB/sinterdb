import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 31,
  name: "DEFAULT_SOCKET_TIMEOUT_MS",
  kind: "variable",
  label: "Variable",
  href: "/docs/api/variables/DEFAULT_SOCKET_TIMEOUT_MS",
  since: null,
  description:
    "The default socketTimeoutMS: 0, which disables the idle timeout.",
  badges: [],
  declaration: [
    ["const ", "kw"],
    ["DEFAULT_SOCKET_TIMEOUT_MS", "name"],
    [": ", "pn"],
    ["0", "lit"],
  ],
  comment: {
    summary:
      "<p>The default <code>socketTimeoutMS</code>: 0, which disables the idle timeout.</p>",
    short:
      "The default <code>socketTimeoutMS</code>: 0, which disables the idle timeout.",
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
      path: "packages/driver/src/client.ts",
      line: 35,
      url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/client.ts#L35",
    },
  ],
  usedBy: [],
};

export const metadata: Metadata = {
  title: page.name,
  description: page.description || undefined,
};

export default function Page() {
  return <ApiReflectionPage page={page} />;
}
