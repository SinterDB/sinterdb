import type { MessageKindByName } from "./constants.js";
import type { Document, DocumentValue } from "./document.js";

export const ProtocolCapability = {
  TypedDocuments: "typed-documents",
  Streaming: "streaming",
  Projection: "projection",
  CompoundIndexes: "compound-indexes",
  Aggregation: "aggregation",
  QueryBudgets: "query-budgets",
} as const;

export type ProtocolCapability =
  (typeof ProtocolCapability)[keyof typeof ProtocolCapability];

export const HandshakeRole = {
  Client: "client",
  Server: "server",
} as const;

export type HandshakeRole = (typeof HandshakeRole)[keyof typeof HandshakeRole];

export interface HandshakeEnvelope {
  role: HandshakeRole;
  protocolVersion: number;
  product: string;
  productVersion: string;
  capabilities: string[];
}

export interface PingEnvelope {
  sentAt: Date;
}

export interface CommandEnvelope {
  command: string;
  database?: string;
  parameters: Document;
}

export interface ResultEnvelope {
  value: DocumentValue;
}

export interface StreamItemEnvelope {
  sequence: number;
  value: DocumentValue;
}

export interface StreamEndEnvelope {
  count: number;
}

export interface ErrorEnvelope {
  code: number;
  name: string;
  message: string;
  retryable: boolean;
  details?: Document;
}

export type MessagePayloadByName = {
  Handshake: HandshakeEnvelope;
  Ping: PingEnvelope;
  Command: CommandEnvelope;
  Result: ResultEnvelope;
  StreamItem: StreamItemEnvelope;
  StreamEnd: StreamEndEnvelope;
  Error: ErrorEnvelope;
};

export type MessagePayloadByKind = {
  [
    K in keyof MessagePayloadByName as MessageKindByName[K]
  ]: MessagePayloadByName[K];
};

export type ProtocolEnvelope = MessagePayloadByKind[keyof MessagePayloadByKind];
