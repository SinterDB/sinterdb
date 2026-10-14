import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 303,
  name: "FindCursor",
  kind: "class",
  label: "Class",
  href: "/docs/api/classes/FindCursor",
  since: null,
  description: "A lazy, batched cursor over the results of a find.",
  badges: [],
  declaration: [
    ["class ", "kw"],
    ["FindCursor", "name"],
    ["<", "pn"],
    ["TDocument", "tp"],
    [" extends ", "kw"],
    ["object", "prim"],
    [" = ", "pn"],
    ["Document", "ref", "/docs/api/interfaces/Document"],
    [", ", "pn"],
    ["TResult", "tp"],
    [" extends ", "kw"],
    ["object", "prim"],
    [" = ", "pn"],
    ["WithId", "ref", "/docs/api/types/WithId"],
    ["<", "pn"],
    ["TDocument", "tp"],
    [">>", "pn"],
    [" implements ", "kw"],
    ["AsyncIterable", "ref"],
    ["<", "pn"],
    ["TResult", "tp"],
    [">", "pn"],
  ],
  comment: {
    summary:
      "<p>A lazy, batched cursor over the results of a find.</p>\n<p>Nothing is sent until the first read. Documents arrive in batches, and the\ncursor releases its server-side state when it is exhausted or closed.\n<code>toArray()</code> and <code>for await</code> close the cursor for you, even when the loop\nexits early or throws.</p>",
    short: "A lazy, batched cursor over the results of a find.",
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
        [" = ", "pn"],
        ["Document", "ref", "/docs/api/interfaces/Document"],
      ],
      comment: null,
    },
    {
      name: "TResult",
      code: [
        ["TResult", "tp"],
        [" extends ", "kw"],
        ["object", "prim"],
        [" = ", "pn"],
        ["WithId", "ref", "/docs/api/types/WithId"],
        ["<", "pn"],
        ["TDocument", "tp"],
        [">", "pn"],
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
          id: 306,
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
              id: 307,
              code: [
                ["new ", "kw"],
                ["FindCursor", "name"],
                ["<", "pn"],
                ["TDocument", "tp"],
                [" extends ", "kw"],
                ["object", "prim"],
                [" = ", "pn"],
                ["Document", "ref", "/docs/api/interfaces/Document"],
                [", ", "pn"],
                ["TResult", "tp"],
                [" extends ", "kw"],
                ["object", "prim"],
                [" = ", "pn"],
                ["WithId", "ref", "/docs/api/types/WithId"],
                ["<", "pn"],
                ["TDocument", "tp"],
                [">>(", "pn"],
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
                ["filter", "param"],
                [": ", "pn"],
                ["Document", "ref", "/docs/api/interfaces/Document"],
                [",", "pn"],
                ["\n  "],
                ["batchSize", "param"],
                [": ", "pn"],
                ["number", "prim"],
                [" | ", "pn"],
                ["undefined", "prim"],
                [",", "pn"],
                ["\n  "],
                ["query", "param"],
                ["?: ", "pn"],
                [
                  "FindQueryOptions",
                  "ref",
                  "/docs/api/interfaces/FindQueryOptions",
                ],
                [",", "pn"],
                ["\n"],
                [")", "pn"],
              ],
              comment: null,
              typeParameters: [
                {
                  name: "TDocument",
                  code: [
                    ["TDocument", "tp"],
                    [" extends ", "kw"],
                    ["object", "prim"],
                    [" = ", "pn"],
                    ["Document", "ref", "/docs/api/interfaces/Document"],
                  ],
                  comment: null,
                },
                {
                  name: "TResult",
                  code: [
                    ["TResult", "tp"],
                    [" extends ", "kw"],
                    ["object", "prim"],
                    [" = ", "pn"],
                    ["WithId", "ref", "/docs/api/types/WithId"],
                    ["<", "pn"],
                    ["TDocument", "tp"],
                    [">", "pn"],
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
                  name: "filter",
                  code: [
                    ["filter", "param"],
                    [": ", "pn"],
                    ["Document", "ref", "/docs/api/interfaces/Document"],
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
                  name: "query",
                  code: [
                    ["query", "param"],
                    ["?: ", "pn"],
                    [
                      "FindQueryOptions",
                      "ref",
                      "/docs/api/interfaces/FindQueryOptions",
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
                  line: 45,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L45",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/cursor.ts",
              line: 45,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L45",
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
          id: 334,
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
              id: 335,
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
                  line: 136,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L136",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/cursor.ts",
              line: 136,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L136",
            },
          ],
        },
        {
          id: 331,
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
              id: 332,
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
                  line: 117,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L117",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/cursor.ts",
              line: 117,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L117",
            },
          ],
        },
        {
          id: 323,
          name: "explain",
          anchor: "explain",
          kind: "method",
          deprecated: false,
          since: null,
          label: "Method",
          badges: [],
          code: null,
          comment: null,
          signatures: [
            {
              id: 324,
              code: [
                ["explain", "name"],
                ["(): ", "pn"],
                ["Promise", "ref"],
                ["<", "pn"],
                ["ExplainResult", "ref", "/docs/api/interfaces/ExplainResult"],
                [">", "pn"],
              ],
              comment: {
                summary:
                  "<p>Asks the server how it would run this query, without running it. The\nsort, skip, limit, and batch size do not change the plan.</p>",
                short:
                  "Asks the server how it would run this query, without running it. The sort, skip, limit, and batch size do not change the plan.",
                deprecated: null,
                modifiers: ["beta"],
                blocks: [],
              },
              typeParameters: [],
              parameters: [],
              returns: {
                code: [
                  ["Promise", "ref"],
                  ["<", "pn"],
                  [
                    "ExplainResult",
                    "ref",
                    "/docs/api/interfaces/ExplainResult",
                  ],
                  [">", "pn"],
                ],
                html: null,
              },
              sources: [
                {
                  path: "packages/driver/src/cursor.ts",
                  line: 59,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L59",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/cursor.ts",
              line: 59,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L59",
            },
          ],
        },
        {
          id: 325,
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
              id: 326,
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
                  line: 71,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L71",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/cursor.ts",
              line: 71,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L71",
            },
          ],
        },
        {
          id: 327,
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
              id: 328,
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
                  line: 87,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L87",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/cursor.ts",
              line: 87,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L87",
            },
          ],
        },
        {
          id: 329,
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
              id: 330,
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
                  line: 99,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L99",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/cursor.ts",
              line: 99,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L99",
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
          anchor: "explain",
          name: "explain",
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
      line: 37,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L37",
    },
  ],
  usedBy: [
    {
      name: "SinterCollection.find",
      href: "/docs/api/classes/SinterCollection#find",
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
