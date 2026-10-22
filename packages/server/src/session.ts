import type { Socket } from "node:net";

import {
  encodeMessage,
  HandshakeRole,
  MessageKind,
  MessageStreamDecoder,
  PROTOCOL_VERSION,
  ProtocolCapability,
  ProtocolError,
  ProtocolErrorCode,
  WireErrorCode,
  type CommandEnvelope,
  type DecodedMessage,
  type Document,
  type DocumentValue,
  type ErrorEnvelope,
} from "sinterdb-protocol";

import {
  CommandExecutionError,
  SERVER_PRODUCT,
  SERVER_PRODUCT_VERSION,
  type CommandDispatcher,
} from "./command-dispatcher.js";
import { CursorManager } from "./cursor-manager.js";
import type { DurabilityBarrier } from "./group-commit.js";

const CURSOR_SWEEP_INTERVAL_MS = 30_000;

export const ServerSessionState = {
  AwaitingHandshake: "awaiting-handshake",
  Ready: "ready",
  Closing: "closing",
  Closed: "closed",
} as const;

export type ServerSessionState =
  (typeof ServerSessionState)[keyof typeof ServerSessionState];

/** What the server reports about one command it ran, when asked to. */
export interface ServerCommandEvent {
  /** The command name, such as `find` or `insertOne`. */
  readonly command: string;
  readonly database?: string;
  readonly collection?: string;
  /**
   * Milliseconds the server spent running the command. It does not include
   * time spent waiting for a flush to stable storage.
   */
  readonly durationMs: number;
  readonly ok: boolean;
  /** The error name when the command failed, such as `DuplicateKey`. */
  readonly error?: string;
}

export interface ServerSessionOptions {
  dispatcher: CommandDispatcher;
  /**
   * When set, replies are held while writes are waiting to be flushed and are
   * sent only after the flush, so an acknowledged write is always durable.
   */
  durability?: DurabilityBarrier;
  product?: string;
  productVersion?: string;
  /**
   * An unexpected failure while running a command. Reaching this means the
   * server hit a bug, so the server treats it as fatal.
   */
  onError?: (error: Error) => void;
  /**
   * A failure of this one connection, such as a reset by the peer. It affects
   * only this session and never the server.
   */
  onConnectionError?: (error: Error) => void;
  /**
   * Called once for every command, after it ran, whether it worked or failed.
   * Leave it out and the session does no timing at all.
   */
  onCommand?: (event: ServerCommandEvent) => void;
}

export class ServerSession {
  private readonly decoder = new MessageStreamDecoder();
  private readonly cursors = new CursorManager();
  private readonly sweepTimer: ReturnType<typeof setInterval>;
  private readonly dispatcher: CommandDispatcher;
  private readonly durability: DurabilityBarrier | undefined;
  private readonly product: string;
  private readonly productVersion: string;
  private readonly onError: (error: Error) => void;
  private readonly onConnectionError: (error: Error) => void;
  private readonly onCommand: ((event: ServerCommandEvent) => void) | undefined;
  private held: Uint8Array[] = [];
  private holding = false;
  private endAfterRelease = false;
  private currentState: ServerSessionState =
    ServerSessionState.AwaitingHandshake;

  public constructor(
    private readonly socket: Socket,
    options: ServerSessionOptions,
  ) {
    this.dispatcher = options.dispatcher;
    this.durability = options.durability;
    this.product = options.product ?? SERVER_PRODUCT;
    this.productVersion = options.productVersion ?? SERVER_PRODUCT_VERSION;
    this.onError = options.onError ?? (() => undefined);
    this.onConnectionError = options.onConnectionError ?? (() => undefined);
    this.onCommand = options.onCommand;
    this.sweepTimer = setInterval(() => {
      this.cursors.sweepExpired();
    }, CURSOR_SWEEP_INTERVAL_MS);
    this.sweepTimer.unref();

    socket.on("data", (chunk: Buffer) => {
      if (typeof chunk === "string") {
        this.handleProtocolFailure(
          new TypeError("SinterDB sockets must provide binary data."),
        );
        return;
      }

      this.handleData(chunk);
    });
    socket.on("error", (error) => {
      // A reset or broken connection ends this session only.
      this.onConnectionError(error);
      socket.destroy();
    });

    socket.once("close", () => {
      clearInterval(this.sweepTimer);
      this.cursors.clear();
      this.decoder.reset();
      this.currentState = ServerSessionState.Closed;
    });
  }

  public get state(): ServerSessionState {
    return this.currentState;
  }

  public close(): void {
    if (
      this.currentState === ServerSessionState.Closing ||
      this.currentState === ServerSessionState.Closed
    ) {
      return;
    }

    this.currentState = ServerSessionState.Closing;
    this.socket.end();
  }

  private handleData(chunk: Uint8Array): void {
    if (!this.canReceiveMessages()) {
      return;
    }

    let messages: DecodedMessage[];

    try {
      messages = this.decoder.push(chunk);
    } catch (error: unknown) {
      this.handleProtocolFailure(error);
      return;
    }

    for (const message of messages) {
      if (!this.canReceiveMessages()) {
        break;
      }

      this.handleMessage(message);
    }
  }

  private canReceiveMessages(): boolean {
    return (
      this.currentState === ServerSessionState.AwaitingHandshake ||
      this.currentState === ServerSessionState.Ready
    );
  }

  private handleMessage(message: DecodedMessage): void {
    if (message.requestId === 0) {
      this.sendError(
        0,
        WireErrorCode.InvalidRequest,
        "InvalidRequest",
        "Client requests must use a non-zero request ID.",
        true,
      );
      return;
    }

    if (this.currentState === ServerSessionState.AwaitingHandshake) {
      this.handleHandshake(message);
      return;
    }

    switch (message.kind) {
      case MessageKind.Ping:
        this.send(MessageKind.Result, message.requestId, {
          value: {
            ok: true,
            sentAt: message.payload.sentAt,
            receivedAt: new Date(),
          },
        });
        return;

      case MessageKind.Command:
        this.handleCommand(message.requestId, message.payload);
        return;

      case MessageKind.Handshake:
        this.sendError(
          message.requestId,
          WireErrorCode.InvalidRequest,
          "InvalidRequest",
          "The connection handshake has already completed.",
          false,
        );
        return;

      default:
        this.sendError(
          message.requestId,
          WireErrorCode.InvalidRequest,
          "InvalidRequest",
          "Clients may only send handshake, ping, and command messages.",
          false,
        );
    }
  }

  private handleCommand(requestId: number, command: CommandEnvelope): void {
    let value: DocumentValue;
    const started = this.onCommand === undefined ? 0 : performance.now();

    try {
      value = this.dispatcher.dispatch(command, this.cursors);
    } catch (error: unknown) {
      this.reportCommand(
        command,
        started,
        error instanceof CommandExecutionError ? error.name : "InternalError",
      );
      this.holdUntilDurable();

      if (error instanceof CommandExecutionError) {
        this.sendError(
          requestId,
          error.code,
          error.name,
          error.message,
          false,
          error.details,
        );
        return;
      }

      this.failCommand(requestId, error);
      return;
    }

    this.reportCommand(command, started, undefined);
    this.holdUntilDurable();

    try {
      this.send(MessageKind.Result, requestId, { value });
    } catch (error: unknown) {
      if (
        error instanceof ProtocolError &&
        error.code === ProtocolErrorCode.PayloadTooLarge
      ) {
        // The command ran, but its result does not fit in one message. That
        // is a property of the stored data, not a fault of the server.
        this.sendError(
          requestId,
          WireErrorCode.InternalError,
          "ResultTooLarge",
          "The result is larger than the 16 MiB message limit. Request fewer or smaller documents.",
          false,
        );
        return;
      }

      this.failCommand(requestId, error);
    }
  }

  private reportCommand(
    command: CommandEnvelope,
    started: number,
    error: string | undefined,
  ): void {
    if (this.onCommand === undefined) {
      return;
    }

    const collection = command.parameters["collection"];

    try {
      this.onCommand({
        command: command.command,
        ...(command.database === undefined
          ? {}
          : { database: command.database }),
        ...(typeof collection === "string" ? { collection } : {}),
        durationMs: performance.now() - started,
        ok: error === undefined,
        ...(error === undefined ? {} : { error }),
      });
    } catch {
      // Reporting is for people watching the server. If it fails, the command
      // it was reporting must still get its reply.
    }
  }

  /**
   * Starts holding replies when writes are waiting for a flush. Every later
   * reply on this connection waits too, which keeps replies in order.
   */
  private holdUntilDurable(): void {
    if (this.holding || this.durability?.hasPending !== true) {
      return;
    }

    this.holding = true;
    this.durability.whenDurable((error) => this.release(error));
  }

  private release(error: unknown): void {
    this.holding = false;

    const held = this.held;
    const endAfterRelease = this.endAfterRelease;

    this.held = [];
    this.endAfterRelease = false;

    if (this.socket.destroyed || this.socket.writableEnded) {
      return;
    }

    if (error !== undefined) {
      // The writes could not be made durable, so none of the held replies may
      // report success. Dropping the connection is the honest answer.
      this.onError(
        error instanceof Error ? error : new Error("The log flush failed."),
      );
      this.socket.destroy();
      return;
    }

    for (const data of held) {
      this.socket.write(data);
    }

    if (endAfterRelease) {
      this.socket.end();
    }
  }

  private write(data: Uint8Array): void {
    if (this.holding) {
      this.held.push(data);
      return;
    }

    this.socket.write(data);
  }

  private failCommand(requestId: number, error: unknown): void {
    const internalError =
      error instanceof Error
        ? error
        : new Error("Unknown command execution failure.");

    this.onError(internalError);

    this.sendError(
      requestId,
      WireErrorCode.InternalError,
      "InternalError",
      "The server failed to execute the command.",
      false,
    );
  }

  private handleHandshake(message: DecodedMessage): void {
    if (message.kind !== MessageKind.Handshake) {
      this.sendError(
        message.requestId,
        WireErrorCode.InvalidRequest,
        "InvalidRequest",
        "The first message on a connection must be a handshake.",
        true,
      );
      return;
    }

    if (message.payload.role !== HandshakeRole.Client) {
      this.sendError(
        message.requestId,
        WireErrorCode.InvalidRequest,
        "InvalidRequest",
        "The opening handshake must use the client role.",
        true,
      );
      return;
    }

    if (message.payload.protocolVersion !== PROTOCOL_VERSION) {
      this.sendError(
        message.requestId,
        WireErrorCode.UnsupportedProtocolVersion,
        "UnsupportedProtocolVersion",
        `Protocol version ${message.payload.protocolVersion} is not supported.`,
        true,
      );
      return;
    }

    this.send(MessageKind.Handshake, message.requestId, {
      role: HandshakeRole.Server,
      protocolVersion: PROTOCOL_VERSION,
      product: this.product,
      productVersion: this.productVersion,
      capabilities: [
        ProtocolCapability.TypedDocuments,
        ProtocolCapability.Streaming,
        ProtocolCapability.Projection,
        ProtocolCapability.CompoundIndexes,
        ProtocolCapability.Aggregation,
        ProtocolCapability.QueryBudgets,
      ],
    });

    this.currentState = ServerSessionState.Ready;
  }

  private handleProtocolFailure(error: unknown): void {
    const details: Document =
      error instanceof ProtocolError
        ? {
            protocolErrorCode: error.code,
          }
        : {};

    this.sendError(
      0,
      WireErrorCode.InvalidRequest,
      "InvalidRequest",
      error instanceof Error ? error.message : "Invalid protocol input.",
      true,
      details,
    );
  }

  private send<K extends (typeof MessageKind)[keyof typeof MessageKind]>(
    kind: K,
    requestId: number,
    payload: Parameters<typeof encodeMessage<K>>[0]["payload"],
  ): void {
    this.write(
      encodeMessage({
        kind,
        requestId,
        payload,
      }),
    );
  }

  private sendError(
    requestId: number,
    code: number,
    name: string,
    message: string,
    closeConnection: boolean,
    details?: Document,
  ): void {
    const payload: ErrorEnvelope = {
      code,
      name,
      message,
      retryable: false,
      ...(details === undefined ? {} : { details }),
    };

    const encoded = encodeMessage({
      kind: MessageKind.Error,
      requestId,
      payload,
    });

    if (closeConnection) {
      this.currentState = ServerSessionState.Closing;

      if (this.holding) {
        this.held.push(encoded);
        this.endAfterRelease = true;
        return;
      }

      this.socket.end(encoded);
      return;
    }

    this.write(encoded);
  }
}
