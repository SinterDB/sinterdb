import { describe, expect, it } from "vitest";

import { MessageKind, PROTOCOL_VERSION } from "./constants.js";
import { WireErrorCode } from "./errors.js";
import {
  HandshakeRole,
  ProtocolCapability,
  type MessagePayloadByKind,
} from "./messages.js";

describe("protocol message envelopes", () => {
  it("defines stable capabilities", () => {
    expect(ProtocolCapability).toEqual({
      TypedDocuments: "typed-documents",
      Streaming: "streaming",
      Projection: "projection",
    });
  });

  it("defines stable handshake roles", () => {
    expect(HandshakeRole).toEqual({
      Client: "client",
      Server: "server",
    });
  });

  it("maps every message kind to a payload type", () => {
    const messages: MessagePayloadByKind = {
      [MessageKind.Handshake]: {
        role: HandshakeRole.Client,
        protocolVersion: PROTOCOL_VERSION,
        product: "sinterdb",
        productVersion: "0.0.3",
        capabilities: [
          ProtocolCapability.TypedDocuments,
          ProtocolCapability.Streaming,
        ],
      },
      [MessageKind.Ping]: {
        sentAt: new Date("2026-09-17T00:00:00.000Z"),
      },
      [MessageKind.Command]: {
        command: "listDatabases",
        parameters: {},
      },
      [MessageKind.Result]: {
        value: {
          databases: [],
        },
      },
      [MessageKind.StreamItem]: {
        sequence: 0,
        value: {
          name: "example",
        },
      },
      [MessageKind.StreamEnd]: {
        count: 1,
      },
      [MessageKind.Error]: {
        code: WireErrorCode.InternalError,
        name: "InternalError",
        message: "An internal error occurred.",
        retryable: false,
      },
    };

    expect(Object.keys(messages)).toHaveLength(Object.keys(MessageKind).length);
  });
});
