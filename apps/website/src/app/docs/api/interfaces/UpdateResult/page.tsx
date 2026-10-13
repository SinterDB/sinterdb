import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 746,
  name: "UpdateResult",
  kind: "interface",
  label: "Interface",
  href: "/docs/api/interfaces/UpdateResult",
  since: null,
  description: "The result of an update or replace.",
  badges: [],
  declaration: [
    ["interface ", "kw"],
    ["UpdateResult", "name"],
  ],
  comment: {
    summary: "<p>The result of an update or replace.</p>",
    short: "The result of an update or replace.",
    deprecated: null,
    modifiers: [],
    blocks: [],
  },
  typeParameters: [],
  hierarchy: null,
  signatureSection: null,
  signatures: [],
  sections: [
    {
      id: "properties",
      title: "Properties",
      members: [
        {
          id: 747,
          name: "acknowledged",
          anchor: "acknowledged",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["acknowledged", "name"],
            [": ", "pn"],
            ["true", "lit"],
          ],
          comment: {
            summary:
              "<p>Always <code>true</code>; a failed update throws instead.</p>",
            short: "Always <code>true</code>; a failed update throws instead.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/update.ts",
              line: 118,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/update.ts#L118",
            },
          ],
        },
        {
          id: 748,
          name: "matchedCount",
          anchor: "matched-count",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["matchedCount", "name"],
            [": ", "pn"],
            ["number", "prim"],
          ],
          comment: {
            summary: "<p>How many documents matched the filter.</p>",
            short: "How many documents matched the filter.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/update.ts",
              line: 120,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/update.ts#L120",
            },
          ],
        },
        {
          id: 749,
          name: "modifiedCount",
          anchor: "modified-count",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["modifiedCount", "name"],
            [": ", "pn"],
            ["number", "prim"],
          ],
          comment: {
            summary:
              "<p>How many documents actually changed. A document whose stored bytes are\nidentical after the update is not counted.</p>",
            short:
              "How many documents actually changed. A document whose stored bytes are identical after the update is not counted.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/update.ts",
              line: 125,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/update.ts#L125",
            },
          ],
        },
        {
          id: 750,
          name: "upsertedId",
          anchor: "upserted-id",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["upsertedId", "name"],
            [": ", "pn"],
            ["CustomId", "ref", "/docs/api/classes/CustomId"],
            [" | ", "pn"],
            ["null", "lit"],
          ],
          comment: {
            summary:
              "<p>The <code>_id</code> of the inserted document when an upsert inserted one, otherwise\n<code>null</code>. In that case <code>matchedCount</code> is 0.</p>",
            short:
              "The <code>_id</code> of the inserted document when an upsert inserted one, otherwise <code>null</code>. In that case <code>matchedCount</code> is 0.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/update.ts",
              line: 130,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/update.ts#L130",
            },
          ],
        },
      ],
    },
  ],
  toc: [
    {
      id: "properties",
      title: "Properties",
      items: [
        {
          anchor: "acknowledged",
          name: "acknowledged",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "matched-count",
          name: "matchedCount",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "modified-count",
          name: "modifiedCount",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "upserted-id",
          name: "upsertedId",
          kind: "property",
          deprecated: false,
        },
      ],
    },
    {
      id: "used-by",
      title: "Used by",
      items: [],
    },
  ],
  sources: [
    {
      path: "packages/driver/src/update.ts",
      line: 116,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/update.ts#L116",
    },
  ],
  usedBy: [
    {
      name: "SinterCollection.replaceOne",
      href: "/docs/api/classes/SinterCollection#replace-one",
      kind: "method",
    },
    {
      name: "SinterCollection.updateMany",
      href: "/docs/api/classes/SinterCollection#update-many",
      kind: "method",
    },
    {
      name: "SinterCollection.updateOne",
      href: "/docs/api/classes/SinterCollection#update-one",
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
