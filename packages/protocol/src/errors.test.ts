import { describe, expect, it } from "vitest";

import { ProtocolError, ProtocolErrorCode, WireErrorCode } from "./errors.js";

describe("ProtocolError", () => {
  it("contains a stable protocol error code", () => {
    const error = new ProtocolError(
      ProtocolErrorCode.InvalidMagic,
      "Invalid frame signature.",
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ProtocolError);
    expect(error.name).toBe("ProtocolError");
    expect(error.code).toBe("INVALID_MAGIC");
    expect(error.message).toBe("Invalid frame signature.");
  });

  it("defines unique error codes", () => {
    const codes = Object.values(ProtocolErrorCode);

    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("WireErrorCode", () => {
  it("defines stable numeric wire codes", () => {
    expect(WireErrorCode).toEqual({
      InvalidRequest: 1000,
      UnsupportedProtocolVersion: 1001,
      UnsupportedCapability: 1002,
      UnknownCommand: 1003,
      RequestTimeout: 1004,
      AuthenticationRequired: 2000,
      AuthenticationFailed: 2001,
      PermissionDenied: 2002,
      NamespaceNotFound: 3000,
      NamespaceConflict: 3001,
      DocumentValidationFailed: 4000,
      DuplicateKey: 4001,
      InvalidUpdate: 4002,
      ImmutableId: 4003,
      CursorNotFound: 5000,
      InvalidIndex: 6000,
      IndexNotFound: 6001,
      IndexConflict: 6002,
      OperationTimeLimitExceeded: 7000,
      ScanLimitExceeded: 7001,
      InternalError: 9000,
    });
  });

  it("assigns a unique number to every wire error", () => {
    const codes = Object.values(WireErrorCode);

    expect(new Set(codes).size).toBe(codes.length);
  });
});
