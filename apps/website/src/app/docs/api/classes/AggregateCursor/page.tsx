import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 376,
  name: "AggregateCursor",
  kind: "class",
  label: "Class",
  href: "/docs/api/classes/AggregateCursor",
  since: null,
  description:
    "A lazy, batched cursor over the results of an aggregation. It reads like a FindCursor: nothing is sent until the first read, documents arrive in batches, and toArray() and for await close the cursor for you.",
  badges: [],
  declaration: [
    ["class ", "kw"],
    ["AggregateCursor", "name"],
    ["<", "pn"],
    ["TResult", "tp"],
    [" extends ", "kw"],
    ["object", "prim"],
    [" = ", "pn"],
    ["Document", "ref", "/docs/api/interfaces/Document"],
    [">", "pn"],
    [" implements ", "kw"],
    ["AsyncIterable", "ref"],
    ["<", "pn"],
    ["TResult", "tp"],
    [">", "pn"],
  ],
  comment: {
    summary:
      '<p>A lazy, batched cursor over the results of an aggregation. It reads like a\n<a href="/docs/api/classes/FindCursor">FindCursor</a>: nothing is sent until the first read, documents arrive in\nbatches, and <code>toArray()</code> and <code>for await</code> close the cursor for you.</p>',
    short:
      'A lazy, batched cursor over the results of an aggregation. It reads like a <a href="/docs/api/classes/FindCursor">FindCursor</a>: nothing is sent until the first read, documents arrive in batches, and <code>toArray()</code> and <code>for await</code> close the cursor for you.',
    deprecated: null,
    modifiers: [],
    blocks: [],
  },
  typeParameters: [
    {
      name: "TResult",
      code: [
        ["TResult", "tp"],
        [" extends ", "kw"],
        ["object", "prim"],
        [" = ", "pn"],
        ["Document", "ref", "/docs/api/interfaces/Document"],
      ],
      comment: null,
    },
  ],
  hierarchy: null,
  signatureSection: null,
  signatures: [],
  sections: [
    {
      id: "constructors",
      title: "Constructors",
      members: [
        {
          id: 378,
          name: "constructor",
          anchor: "constructor",
          kind: "constructor",
          deprecated: false,
          since: null,
          label: "Constructor",
          badges: [],
          code: null,
          comment: null,
          signatures: [
            {
              id: 379,
              code: [
                ["new ", "kw"],
                ["AggregateCursor", "name"],
                ["<", "pn"],
                ["TResult", "tp"],
                [" extends ", "kw"],
                ["object", "prim"],
                [" = ", "pn"],
                ["Document", "ref", "/docs/api/interfaces/Document"],
                [">(", "pn"],
                ["\n  "],
                ["execute", "param"],
                [": ", "pn"],
                ["CursorExecutor", "ref", "/docs/api/types/CursorExecutor"],
                [",", "pn"],
                ["\n  "],
                ["collection", "param"],
                [": ", "pn"],
                ["string", "prim"],
                [",", "pn"],
                ["\n  "],
                ["pipeline", "param"],
                [": ", "pn"],
                ["readonly ", "kw"],
                ["Document", "ref", "/docs/api/interfaces/Document"],
                ["[],", "pn"],
                ["\n  "],
                ["batchSize", "param"],
                [": ", "pn"],
                ["number", "prim"],
                [" | ", "pn"],
                ["undefined", "prim"],
                [",", "pn"],
                ["\n  "],
                ["budget", "param"],
                ["?: ", "pn"],
                [
                  "QueryBudgetOptions",
                  "ref",
                  "/docs/api/interfaces/QueryBudgetOptions",
                ],
                [",", "pn"],
                ["\n"],
                [")", "pn"],
              ],
              comment: null,
              typeParameters: [
                {
                  name: "TResult",
                  code: [
                    ["TResult", "tp"],
                    [" extends ", "kw"],
                    ["object", "prim"],
                    [" = ", "pn"],
                    ["Document", "ref", "/docs/api/interfaces/Document"],
                  ],
                  comment: null,
                },
              ],
              parameters: [
                {
                  name: "execute",
                  code: [
                    ["execute", "param"],
                    [": ", "pn"],
                    ["CursorExecutor", "ref", "/docs/api/types/CursorExecutor"],
                  ],
                  comment: null,
                  members: [],
                },
                {
                  name: "collection",
                  code: [
                    ["collection", "param"],
                    [": ", "pn"],
                    ["string", "prim"],
                  ],
                  comment: null,
                  members: [],
                },
                {
                  name: "pipeline",
                  code: [
                    ["pipeline", "param"],
                    [": ", "pn"],
                    ["readonly ", "kw"],
                    ["Document", "ref", "/docs/api/interfaces/Document"],
                    ["[]", "pn"],
                  ],
                  comment: null,
                  members: [],
                },
                {
                  name: "batchSize",
                  code: [
                    ["batchSize", "param"],
                    [": ", "pn"],
                    ["number", "prim"],
                    [" | ", "pn"],
                    ["undefined", "prim"],
                  ],
                  comment: null,
                  members: [],
                },
                {
                  name: "budget",
                  code: [
                    ["budget", "param"],
                    ["?: ", "pn"],
                    [
                      "QueryBudgetOptions",
                      "ref",
                      "/docs/api/interfaces/QueryBudgetOptions",
                    ],
                  ],
                  comment: null,
                  members: [],
                },
              ],
              returns: null,
              sources: [
                {
                  path: "packages/driver/src/cursor.ts",
                  line: 247,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L247",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/cursor.ts",
              line: 247,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L247",
            },
          ],
        },
      ],
    },
    {
      id: "methods",
      title: "Methods",
      members: [
        {
          id: 395,
          name: "[asyncIterator]",
          anchor: "async-iterator",
          kind: "method",
          deprecated: false,
          since: null,
          label: "Method",
          badges: [],
          code: null,
          comment: null,
          signatures: [
            {
              id: 396,
              code: [
                ["[asyncIterator]", "name"],
                ["(): ", "pn"],
                ["AsyncGenerator", "ref"],
                ["<", "pn"],
                ["TResult", "tp"],
                [", ", "pn"],
                ["void", "prim"],
                [", ", "pn"],
                ["undefined", "prim"],
                [">", "pn"],
              ],
              comment: {
                summary:
                  "<p>Iterates the remaining documents, closing the cursor when the loop ends.</p>",
                short:
                  "Iterates the remaining documents, closing the cursor when the loop ends.",
                deprecated: null,
                modifiers: [],
                blocks: [],
              },
              typeParameters: [],
              parameters: [],
              returns: {
                code: [
                  ["AsyncGenerator", "ref"],
                  ["<", "pn"],
                  ["TResult", "tp"],
                  [", ", "pn"],
                  ["void", "prim"],
                  [", ", "pn"],
                  ["undefined", "prim"],
                  [">", "pn"],
                ],
                html: null,
              },
              sources: [
                {
                  path: "packages/driver/src/cursor.ts",
                  line: 303,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L303",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/cursor.ts",
              line: 303,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L303",
            },
          ],
        },
        {
          id: 393,
          name: "close",
          anchor: "close",
          kind: "method",
          deprecated: false,
          since: null,
          label: "Method",
          badges: [],
          code: null,
          comment: null,
          signatures: [
            {
              id: 394,
              code: [
                ["close", "name"],
                ["(): ", "pn"],
                ["Promise", "ref"],
                ["<", "pn"],
                ["void", "prim"],
                [">", "pn"],
              ],
              comment: {
                summary:
                  "<p>Closes the cursor and releases it on the server. Closing twice does\nnothing.</p>",
                short:
                  "Closes the cursor and releases it on the server. Closing twice does nothing.",
                deprecated: null,
                modifiers: [],
                blocks: [],
              },
              typeParameters: [],
              parameters: [],
              returns: {
                code: [
                  ["Promise", "ref"],
                  ["<", "pn"],
                  ["void", "prim"],
                  [">", "pn"],
                ],
                html: null,
              },
              sources: [
                {
                  path: "packages/driver/src/cursor.ts",
                  line: 296,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L296",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/cursor.ts",
              line: 296,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L296",
            },
          ],
        },
        {
          id: 387,
          name: "hasNext",
          anchor: "has-next",
          kind: "method",
          deprecated: false,
          since: null,
          label: "Method",
          badges: [],
          code: null,
          comment: null,
          signatures: [
            {
              id: 388,
              code: [
                ["hasNext", "name"],
                ["(): ", "pn"],
                ["Promise", "ref"],
                ["<", "pn"],
                ["boolean", "prim"],
                [">", "pn"],
              ],
              comment: {
                summary:
                  "<p>Whether another document is available. This may fetch the next batch.</p>",
                short:
                  "Whether another document is available. This may fetch the next batch.",
                deprecated: null,
                modifiers: [],
                blocks: [],
              },
              typeParameters: [],
              parameters: [],
              returns: {
                code: [
                  ["Promise", "ref"],
                  ["<", "pn"],
                  ["boolean", "prim"],
                  [">", "pn"],
                ],
                html: null,
              },
              sources: [
                {
                  path: "packages/driver/src/cursor.ts",
                  line: 272,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L272",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/cursor.ts",
              line: 272,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L272",
            },
          ],
        },
        {
          id: 389,
          name: "next",
          anchor: "next",
          kind: "method",
          deprecated: false,
          since: null,
          label: "Method",
          badges: [],
          code: null,
          comment: null,
          signatures: [
            {
              id: 390,
              code: [
                ["next", "name"],
                ["(): ", "pn"],
                ["Promise", "ref"],
                ["<", "pn"],
                ["TResult", "tp"],
                [" | ", "pn"],
                ["null", "lit"],
                [">", "pn"],
              ],
              comment: {
                summary:
                  "<p>Returns the next document, or <code>null</code> when the results are exhausted or\nthe cursor is closed.</p>",
                short:
                  "Returns the next document, or <code>null</code> when the results are exhausted or the cursor is closed.",
                deprecated: null,
                modifiers: [],
                blocks: [],
              },
              typeParameters: [],
              parameters: [],
              returns: {
                code: [
                  ["Promise", "ref"],
                  ["<", "pn"],
                  ["TResult", "tp"],
                  [" | ", "pn"],
                  ["null", "lit"],
                  [">", "pn"],
                ],
                html: null,
              },
              sources: [
                {
                  path: "packages/driver/src/cursor.ts",
                  line: 280,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L280",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/cursor.ts",
              line: 280,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L280",
            },
          ],
        },
        {
          id: 391,
          name: "toArray",
          anchor: "to-array",
          kind: "method",
          deprecated: false,
          since: null,
          label: "Method",
          badges: [],
          code: null,
          comment: null,
          signatures: [
            {
              id: 392,
              code: [
                ["toArray", "name"],
                ["(): ", "pn"],
                ["Promise", "ref"],
                ["<", "pn"],
                ["TResult", "tp"],
                ["[]>", "pn"],
              ],
              comment: {
                summary:
                  "<p>Reads all remaining documents into an array and closes the cursor. Large\nresult sets are held in memory; iterate instead when they may be large.</p>",
                short:
                  "Reads all remaining documents into an array and closes the cursor. Large result sets are held in memory; iterate instead when they may be large.",
                deprecated: null,
                modifiers: [],
                blocks: [],
              },
              typeParameters: [],
              parameters: [],
              returns: {
                code: [
                  ["Promise", "ref"],
                  ["<", "pn"],
                  ["TResult", "tp"],
                  ["[]>", "pn"],
                ],
                html: null,
              },
              sources: [
                {
                  path: "packages/driver/src/cursor.ts",
                  line: 288,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L288",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/cursor.ts",
              line: 288,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L288",
            },
          ],
        },
      ],
    },
  ],
  toc: [
    {
      id: "constructors",
      title: "Constructors",
      items: [
        {
          anchor: "constructor",
          name: "constructor",
          kind: "constructor",
          deprecated: false,
        },
      ],
    },
    {
      id: "methods",
      title: "Methods",
      items: [
        {
          anchor: "async-iterator",
          name: "[asyncIterator]",
          kind: "method",
          deprecated: false,
        },
        {
          anchor: "close",
          name: "close",
          kind: "method",
          deprecated: false,
        },
        {
          anchor: "has-next",
          name: "hasNext",
          kind: "method",
          deprecated: false,
        },
        {
          anchor: "next",
          name: "next",
          kind: "method",
          deprecated: false,
        },
        {
          anchor: "to-array",
          name: "toArray",
          kind: "method",
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
      path: "packages/driver/src/cursor.ts",
      line: 242,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L242",
    },
  ],
  usedBy: [
    {
      name: "SinterCollection.aggregate",
      href: "/docs/api/classes/SinterCollection#aggregate",
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
