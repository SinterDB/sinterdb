export const WireErrorCode = {
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
} as const;

export type WireErrorCode = (typeof WireErrorCode)[keyof typeof WireErrorCode];

export const ProtocolErrorCode = {
  InvalidMagic: "INVALID_MAGIC",
  UnsupportedVersion: "UNSUPPORTED_VERSION",
  InvalidMessageKind: "INVALID_MESSAGE_KIND",
  InvalidFlags: "INVALID_FLAGS",
  InvalidRequestId: "INVALID_REQUEST_ID",
  InvalidPayload: "INVALID_PAYLOAD",
  PayloadTooLarge: "PAYLOAD_TOO_LARGE",
  IncompleteFrame: "INCOMPLETE_FRAME",
  PayloadLengthMismatch: "PAYLOAD_LENGTH_MISMATCH",
  InvalidDocumentValue: "INVALID_DOCUMENT_VALUE",
  IntegerOutOfRange: "INTEGER_OUT_OF_RANGE",
  InvalidDate: "INVALID_DATE",
  DocumentTooDeep: "DOCUMENT_TOO_DEEP",
  CyclicDocument: "CYCLIC_DOCUMENT",
  UnexpectedEnd: "UNEXPECTED_END",
  UnknownValueTag: "UNKNOWN_VALUE_TAG",
  InvalidUtf8: "INVALID_UTF8",
  DuplicateDocumentKey: "DUPLICATE_DOCUMENT_KEY",
  TrailingData: "TRAILING_DATA",
  InvalidMessagePayload: "INVALID_MESSAGE_PAYLOAD",
} as const;

export type ProtocolErrorCode =
  (typeof ProtocolErrorCode)[keyof typeof ProtocolErrorCode];

export class ProtocolError extends Error {
  public override readonly name = "ProtocolError";
  public readonly code: ProtocolErrorCode;
  public constructor(code: ProtocolErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}
