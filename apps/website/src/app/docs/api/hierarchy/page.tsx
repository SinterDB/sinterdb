import type { Metadata } from "next";

import { ApiHierarchyPage } from "../_components/pages";
import type { ApiHierarchyNode } from "../_generated/model";

const nodes: readonly ApiHierarchyNode[] = [
  {
    name: "QueryBudgetOptions",
    href: "/docs/api/interfaces/QueryBudgetOptions",
    kind: "interface",
    deprecated: false,
    current: false,
    children: [
      {
        name: "AggregateOptions",
        href: "/docs/api/interfaces/AggregateOptions",
        kind: "interface",
        deprecated: false,
        current: false,
        children: [],
      },
      {
        name: "FindOneOptions",
        href: "/docs/api/interfaces/FindOneOptions",
        kind: "interface",
        deprecated: false,
        current: false,
        children: [],
      },
      {
        name: "FindOptions",
        href: "/docs/api/interfaces/FindOptions",
        kind: "interface",
        deprecated: false,
        current: false,
        children: [],
      },
      {
        name: "FindQueryOptions",
        href: "/docs/api/interfaces/FindQueryOptions",
        kind: "interface",
        deprecated: false,
        current: false,
        children: [],
      },
    ],
  },
  {
    name: "Error",
    href: null,
    kind: null,
    deprecated: false,
    current: false,
    children: [
      {
        name: "SinterError",
        href: "/docs/api/classes/SinterError",
        kind: "class",
        deprecated: false,
        current: false,
        children: [
          {
            name: "SinterClientOptionsError",
            href: "/docs/api/classes/SinterClientOptionsError",
            kind: "class",
            deprecated: false,
            current: false,
            children: [
              {
                name: "SinterNamespaceError",
                href: "/docs/api/classes/SinterNamespaceError",
                kind: "class",
                deprecated: false,
                current: false,
                children: [],
              },
            ],
          },
          {
            name: "SinterClientStateError",
            href: "/docs/api/classes/SinterClientStateError",
            kind: "class",
            deprecated: false,
            current: false,
            children: [],
          },
          {
            name: "SinterConnectionError",
            href: "/docs/api/classes/SinterConnectionError",
            kind: "class",
            deprecated: false,
            current: false,
            children: [
              {
                name: "SinterConnectionTimeoutError",
                href: "/docs/api/classes/SinterConnectionTimeoutError",
                kind: "class",
                deprecated: false,
                current: false,
                children: [],
              },
              {
                name: "SinterSocketTimeoutError",
                href: "/docs/api/classes/SinterSocketTimeoutError",
                kind: "class",
                deprecated: false,
                current: false,
                children: [],
              },
            ],
          },
          {
            name: "SinterConnectionStringError",
            href: "/docs/api/classes/SinterConnectionStringError",
            kind: "class",
            deprecated: false,
            current: false,
            children: [],
          },
          {
            name: "SinterDocumentError",
            href: "/docs/api/classes/SinterDocumentError",
            kind: "class",
            deprecated: false,
            current: false,
            children: [],
          },
          {
            name: "SinterProtocolError",
            href: "/docs/api/classes/SinterProtocolError",
            kind: "class",
            deprecated: false,
            current: false,
            children: [],
          },
          {
            name: "SinterRequestTimeoutError",
            href: "/docs/api/classes/SinterRequestTimeoutError",
            kind: "class",
            deprecated: false,
            current: false,
            children: [],
          },
          {
            name: "SinterServerError",
            href: "/docs/api/classes/SinterServerError",
            kind: "class",
            deprecated: false,
            current: false,
            children: [
              {
                name: "SinterCompatibilityError",
                href: "/docs/api/classes/SinterCompatibilityError",
                kind: "class",
                deprecated: false,
                current: false,
                children: [],
              },
              {
                name: "SinterInsertManyError",
                href: "/docs/api/classes/SinterInsertManyError",
                kind: "class",
                deprecated: false,
                current: false,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "ErrorOptions",
    href: null,
    kind: null,
    deprecated: false,
    current: false,
    children: [
      {
        name: "SinterServerErrorOptions",
        href: "/docs/api/interfaces/SinterServerErrorOptions",
        kind: "interface",
        deprecated: false,
        current: false,
        children: [],
      },
    ],
  },
  {
    name: "EventEmitter<SinterClientEvents>",
    href: null,
    kind: null,
    deprecated: false,
    current: false,
    children: [
      {
        name: "SinterClient",
        href: "/docs/api/classes/SinterClient",
        kind: "class",
        deprecated: false,
        current: false,
        children: [],
      },
    ],
  },
];

export const metadata: Metadata = {
  title: "Hierarchy",
};

export default function Page() {
  return <ApiHierarchyPage nodes={nodes} />;
}
