import { EventEmitter } from "node:events";
import { createConnection, type Socket } from "node:net";
import { performance } from "node:perf_hooks";
import {
  MessageKind,
  ProtocolCapability,
  type Document,
  type DocumentValue,
} from "sinterdb-protocol";

import {
  parseSinterConnectionString,
  type ParsedSinterConnectionString,
} from "./connection-string.js";
import { SinterDatabase } from "./database.js";
import {
  SinterClientOptionsError,
  SinterClientStateError,
  SinterConnectionError,
  SinterConnectionTimeoutError,
  SinterErrorCode,
  SinterProtocolError,
  SinterSocketTimeoutError,
} from "./errors.js";
import { performClientHandshake, type ServerHandshake } from "./handshake.js";
import { parseNameList } from "./list-result.js";
import { SinterNamespaceError } from "./namespace.js";
import { RequestDispatcher } from "./request-dispatcher.js";

/** The default `connectTimeoutMS`: 10 seconds. */
export const DEFAULT_CONNECT_TIMEOUT_MS = 10_000;
/** The default `requestTimeoutMS`: 10 seconds. */
export const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
/** The default `socketTimeoutMS`: 0, which disables the idle timeout. */
export const DEFAULT_SOCKET_TIMEOUT_MS = 0;
export const DRIVER_PRODUCT = "sinterdb-node-driver";
export const DRIVER_PRODUCT_VERSION = "0.3.0";

const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * Options for {@link SinterClient}. Every timeout is a whole number of
 * milliseconds no greater than 2,147,483,647. An invalid value throws a
 * {@link SinterClientOptionsError}.
 */
export interface SinterClientOptions {
  /**
   * How long `connect()` may take, including the protocol handshake, before
   * it fails with a {@link SinterConnectionTimeoutError}. Must be at least 1.
   * Defaults to 10,000.
   */
  readonly connectTimeoutMS?: number;
  /**
   * How long a single request may wait for its response before it fails with
   * a {@link SinterRequestTimeoutError}. Must be at least 1. Defaults to
   * 10,000.
   */
  readonly requestTimeoutMS?: number;
  /**
   * How long the connection may be inactive before the socket is closed with
   * a {@link SinterSocketTimeoutError}. 0, the default, disables the timeout.
   */
  readonly socketTimeoutMS?: number;
}

/**
 * What the server reported during the protocol handshake. Available from
 * {@link SinterClient.serverInfo} once the client is connected.
 */
export interface SinterServerInfo {
  /** The wire protocol version both sides agreed on. */
  readonly protocolVersion: number;
  /** The server's product name. */
  readonly product: string;
  /** The server's version. */
  readonly productVersion: string;
  /** The protocol capabilities the server advertised. */
  readonly capabilities: readonly string[];
}

/** The result of {@link SinterClient.ping}. */
export interface SinterPingResult {
  /** Always `true`; a failed ping throws instead. */
  readonly ok: true;
  /** When the client sent the ping. */
  readonly sentAt: Date;
  /** When the server received the ping, by the server's clock. */
  readonly receivedAt: Date;
  /**
   * The measured round trip, in milliseconds, with sub-millisecond precision.
   */
  readonly roundTripTimeMS: number;
}

/**
 * The events a {@link SinterClient} emits.
 *
 * An `error` event is emitted only while at least one `error` listener is
 * attached.
 */
export interface SinterClientEvents {
  /** Emitted when `connect()` starts a connection attempt. */
  connecting: [client: SinterClient];
  /**
   * Emitted once the handshake has succeeded and the client is ready for
   * commands.
   */
  connected: [client: SinterClient];
  /** Emitted after the client has closed. */
  closed: [client: SinterClient];
  /**
   * Emitted when the connection fails after it was established, such as a
   * socket error or an idle timeout.
   */
  error: [error: Error];
}

/**
 * The lifecycle states of a {@link SinterClient}.
 *
 * A client moves from `new` to `connecting` to `connected`, and finally to
 * `closing` and `closed`. A failed connection attempt returns it to `new`, so
 * `connect()` can be called again. A closed client cannot be reused.
 */
export const SinterClientState = {
  /** Created, not yet connected. Also the state after a failed connection attempt. */
  New: "new",
  /** A connection attempt is in progress. */
  Connecting: "connecting",
  /** Connected and ready for commands. */
  Connected: "connected",
  /** `close()` is in progress. */
  Closing: "closing",
  /** Closed for good; the client cannot be reused. */
  Closed: "closed",
} as const;

/** A value of {@link SinterClientState}. */
export type SinterClientState =
  (typeof SinterClientState)[keyof typeof SinterClientState];

/**
 * A connection to a SinterDB server.
 *
 * Create a client from a `sinterdb://` connection string, call `connect()`,
 * and then use `db()` to reach databases and collections. Commands sent
 * before `connect()` completes throw a {@link SinterClientStateError}. Call
 * `close()` when finished.
 */
export class SinterClient extends EventEmitter<SinterClientEvents> {
  /**
   * The host, port and optional database parsed from the connection string.
   */
  public readonly target: ParsedSinterConnectionString;
  /** The effective connect timeout in milliseconds. */
  public readonly connectTimeoutMS: number;
  /** The effective request timeout in milliseconds. */
  public readonly requestTimeoutMS: number;
  /**
   * The effective idle socket timeout in milliseconds, or 0 when disabled.
   */
  public readonly socketTimeoutMS: number;

  private currentState: SinterClientState = SinterClientState.New;
  private socket: Socket | undefined;
  private pendingConnection: Promise<this> | undefined;
  private negotiatedServer: SinterServerInfo | undefined;
  private requestDispatcher: RequestDispatcher | undefined;

  public constructor(
    connectionString: string,
    options: SinterClientOptions = {},
  ) {
    super();

    this.target = parseSinterConnectionString(connectionString);
    this.connectTimeoutMS = resolveTimeout(
      "connectTimeoutMS",
      options.connectTimeoutMS,
      DEFAULT_CONNECT_TIMEOUT_MS,
    );
    this.requestTimeoutMS = resolveTimeout(
      "requestTimeoutMS",
      options.requestTimeoutMS,
      DEFAULT_REQUEST_TIMEOUT_MS,
    );
    this.socketTimeoutMS = resolveTimeout(
      "socketTimeoutMS",
      options.socketTimeoutMS,
      DEFAULT_SOCKET_TIMEOUT_MS,
      0,
    );
  }

  /** The current lifecycle state. */
  public get state(): SinterClientState {
    return this.currentState;
  }

  /** Whether the client is connected and ready for commands. */
  public get connected(): boolean {
    return this.currentState === SinterClientState.Connected;
  }

  /**
   * What the server reported during the handshake, or `undefined` while the
   * client is not connected.
   */
  public get serverInfo(): SinterServerInfo | undefined {
    return this.negotiatedServer;
  }

  /**
   * Opens the connection and performs the protocol handshake.
   *
   * Calling `connect()` on a connected client resolves immediately, and
   * concurrent calls share one attempt. If the attempt fails, the client
   * returns to `new` and `connect()` may be tried again. A closed client
   * rejects with a {@link SinterClientStateError}.
   *
   * @returns This client, so calls can be chained.
   */
  public connect(): Promise<this> {
    if (this.currentState === SinterClientState.Connected) {
      return Promise.resolve(this);
    }

    if (
      this.currentState === SinterClientState.Closing ||
      this.currentState === SinterClientState.Closed
    ) {
      return Promise.reject(
        new SinterClientStateError(
          SinterErrorCode.ClientClosed,
          "A closed SinterDB client cannot be connected again.",
        ),
      );
    }

    if (this.pendingConnection !== undefined) {
      return this.pendingConnection;
    }

    this.currentState = SinterClientState.Connecting;
    this.emit("connecting", this);

    const connection = this.openSocket();
    this.pendingConnection = connection;

    void connection.then(
      () => {
        if (this.pendingConnection === connection) {
          this.pendingConnection = undefined;
        }
      },
      () => {
        if (this.pendingConnection === connection) {
          this.pendingConnection = undefined;
        }
      },
    );

    return connection;
  }

  /** Sends a ping to the server and measures the round trip. */
  public async ping(): Promise<SinterPingResult> {
    const dispatcher = this.getRequestDispatcher();
    const sentAt = new Date();
    const startedAt = performance.now();

    const response = await dispatcher.request(MessageKind.Ping, {
      sentAt,
    });

    const roundTripTimeMS = performance.now() - startedAt;

    if (response.kind !== MessageKind.Result) {
      throw new SinterProtocolError(
        "The server did not return a result for the ping request.",
      );
    }

    return parsePingResult(response.payload.value, sentAt, roundTripTimeMS);
  }

  /**
   * Sends a command by name and returns the raw result.
   *
   * This is the low-level entry point behind the collection and database
   * methods. Prefer those; the command names and parameters are part of the
   * wire protocol, not of the typed API.
   *
   * @param database - The database to run the command in, or `undefined` for
   *   server-wide commands.
   * @param command - The command name.
   * @param parameters - The command parameters.
   */
  public async executeCommand(
    database: string | undefined,
    command: string,
    parameters: Document,
  ): Promise<DocumentValue> {
    const dispatcher = this.getRequestDispatcher();

    const response = await dispatcher.request(MessageKind.Command, {
      command,
      ...(database === undefined ? {} : { database }),
      parameters,
    });

    if (response.kind !== MessageKind.Result) {
      throw new SinterProtocolError(
        `The server did not return a result for command ${JSON.stringify(command)}.`,
      );
    }

    return response.payload.value;
  }

  /** Lists the names of the databases on the server. */
  public async listDatabases(): Promise<string[]> {
    const value = await this.executeCommand(undefined, "listDatabases", {});

    return parseNameList(value, "databases", "listDatabases");
  }

  /**
   * Returns a handle to a database.
   *
   * The handle is created locally; no request is sent, and the database is
   * created on the server by the first write. Without `name`, the database
   * from the connection string is used.
   *
   * @param name - The database name. Optional when the connection string
   *   names one.
   * @throws {@link SinterNamespaceError} when neither is available, or when
   *   the name is invalid.
   */
  public db(name?: string): SinterDatabase {
    const selectedName = name ?? this.target.database;

    if (selectedName === undefined) {
      throw new SinterNamespaceError(
        "No database was selected in the connection string or db() call.",
      );
    }

    return new SinterDatabase(this, selectedName);
  }

  /**
   * Closes the connection. Requests still waiting for a response fail.
   * Closing a closed client does nothing.
   */
  public async close(): Promise<void> {
    if (this.currentState === SinterClientState.Closed) {
      return;
    }

    this.currentState = SinterClientState.Closing;
    this.negotiatedServer = undefined;

    const dispatcher = this.requestDispatcher;
    this.requestDispatcher = undefined;

    dispatcher?.close(
      new SinterClientStateError(
        SinterErrorCode.ClientClosed,
        "The client closed before the request completed.",
      ),
    );

    const socket = this.socket;
    this.socket = undefined;

    if (socket === undefined || socket.destroyed) {
      this.transitionToClosed();
      return;
    }

    await new Promise<void>((resolve) => {
      socket.once("close", resolve);
      socket.destroy();
    });

    this.transitionToClosed();
  }

  private openSocket(): Promise<this> {
    const { host, port } = this.target;

    return new Promise<this>((resolve, reject) => {
      const socket = createConnection({
        host,
        port,
      });

      this.socket = socket;

      let settled = false;
      let timeout: ReturnType<typeof setTimeout>;

      const cleanupConnectionListeners = (): void => {
        socket.off("connect", onConnect);
        socket.off("error", onError);
        socket.off("close", onClose);
      };

      const finishFailure = (error: Error): void => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeout);
        cleanupConnectionListeners();
        socket.destroy();

        if (this.socket === socket) {
          this.socket = undefined;
        }

        this.negotiatedServer = undefined;
        this.requestDispatcher = undefined;

        const shouldEmitError =
          this.currentState !== SinterClientState.Closing &&
          this.currentState !== SinterClientState.Closed;

        if (this.currentState === SinterClientState.Connecting) {
          this.currentState = SinterClientState.New;
        }

        if (shouldEmitError) {
          this.emitDriverError(error);
        }

        reject(error);
      };

      const finishSuccess = (handshake: ServerHandshake): void => {
        if (settled) {
          return;
        }

        if (this.currentState !== SinterClientState.Connecting) {
          finishFailure(
            new SinterClientStateError(
              SinterErrorCode.ClientClosed,
              "The client was closed while connecting.",
            ),
          );
          return;
        }

        settled = true;
        clearTimeout(timeout);
        cleanupConnectionListeners();
        socket.setTimeout(this.socketTimeoutMS);

        this.negotiatedServer = Object.freeze({
          protocolVersion: handshake.protocolVersion,
          product: handshake.product,
          productVersion: handshake.productVersion,
          capabilities: handshake.capabilities,
        });

        this.requestDispatcher = new RequestDispatcher(socket, {
          requestTimeoutMS: this.requestTimeoutMS,
        });

        this.currentState = SinterClientState.Connected;
        this.attachSocketLifecycle(socket);
        this.emit("connected", this);
        resolve(this);
      };

      const onConnect = (): void => {
        cleanupConnectionListeners();

        void performClientHandshake(socket, {
          product: DRIVER_PRODUCT,
          productVersion: DRIVER_PRODUCT_VERSION,
          capabilities: [ProtocolCapability.TypedDocuments],
        }).then(finishSuccess, (error: unknown) => {
          finishFailure(
            error instanceof Error
              ? error
              : new SinterProtocolError(
                  "The client handshake failed with an unknown error.",
                ),
          );
        });
      };

      const onError = (cause: Error): void => {
        finishFailure(
          new SinterConnectionError(`Could not connect to ${host}:${port}.`, {
            cause,
          }),
        );
      };

      const onClose = (): void => {
        finishFailure(
          new SinterConnectionError(
            `The connection to ${host}:${port} closed before it was established.`,
          ),
        );
      };

      socket.once("connect", onConnect);
      socket.once("error", onError);
      socket.once("close", onClose);

      timeout = setTimeout(() => {
        finishFailure(
          new SinterConnectionTimeoutError(
            `Timed out while connecting to ${host}:${port}.`,
          ),
        );
      }, this.connectTimeoutMS);
    });
  }

  private attachSocketLifecycle(socket: Socket): void {
    socket.on("timeout", () => {
      if (this.socket !== socket) {
        return;
      }

      const error = new SinterSocketTimeoutError(
        `The connection was inactive for ${this.socketTimeoutMS}ms.`,
      );

      this.emitDriverError(error);

      this.requestDispatcher?.close(error);
      this.requestDispatcher = undefined;

      socket.destroy();
    });

    socket.on("error", (error) => {
      this.emitDriverError(error);
    });

    socket.once("close", () => {
      if (this.socket !== socket) {
        return;
      }

      this.socket = undefined;
      this.negotiatedServer = undefined;

      this.requestDispatcher?.close(
        new SinterConnectionError(
          "The database connection closed unexpectedly.",
        ),
      );
      this.requestDispatcher = undefined;

      this.transitionToClosed();
    });
  }

  private getRequestDispatcher(): RequestDispatcher {
    if (
      this.currentState !== SinterClientState.Connected ||
      this.requestDispatcher === undefined
    ) {
      throw new SinterClientStateError(
        SinterErrorCode.ClientNotConnected,
        "The SinterDB client is not connected.",
      );
    }

    return this.requestDispatcher;
  }

  private transitionToClosed(): void {
    if (this.currentState === SinterClientState.Closed) {
      return;
    }

    this.currentState = SinterClientState.Closed;
    this.emit("closed", this);
  }

  private emitDriverError(error: Error): void {
    if (this.listenerCount("error") > 0) {
      this.emit("error", error);
    }
  }
}

function resolveTimeout(
  name: "connectTimeoutMS" | "requestTimeoutMS" | "socketTimeoutMS",
  value: number | undefined,
  defaultValue: number,
  minimum = 1,
): number {
  if (value === undefined) {
    return defaultValue;
  }

  if (
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > MAX_TIMEOUT_MS
  ) {
    throw new SinterClientOptionsError(
      `${name} must be an integer between ${minimum} and ${MAX_TIMEOUT_MS}.`,
    );
  }

  return value;
}

function parsePingResult(
  value: unknown,
  expectedSentAt: Date,
  roundTripTimeMS: number,
): SinterPingResult {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    value instanceof Date ||
    value instanceof Uint8Array
  ) {
    throw new SinterProtocolError(
      "The server returned an invalid ping result.",
    );
  }

  const result = value as Record<string, unknown>;
  const ok = result["ok"];
  const sentAt = result["sentAt"];
  const receivedAt = result["receivedAt"];

  if (
    ok !== true ||
    !(sentAt instanceof Date) ||
    !(receivedAt instanceof Date) ||
    !Number.isFinite(sentAt.getTime()) ||
    !Number.isFinite(receivedAt.getTime())
  ) {
    throw new SinterProtocolError(
      "The server returned an invalid ping result.",
    );
  }

  if (sentAt.getTime() !== expectedSentAt.getTime()) {
    throw new SinterProtocolError(
      "The ping result did not contain the original timestamp.",
    );
  }

  return Object.freeze({
    ok: true,
    sentAt,
    receivedAt,
    roundTripTimeMS,
  });
}
