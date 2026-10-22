import { EventEmitter } from "node:events";
import {
  createServer,
  type AddressInfo,
  type Server as NetServer,
  type Socket,
} from "node:net";

import {
  resolveServerConfig,
  type ServerConfig,
  type ServerConfigInput,
  type ServerEnvironment,
} from "./config.js";
import { StorageEngine, type RecoveryReport } from "@sinterdb-internal/storage";
import { ServerSession } from "./session.js";
import { InMemoryCatalog } from "./catalog.js";
import { CommandDispatcher } from "./command-dispatcher.js";
import { GroupCommitter } from "./group-commit.js";

export const DEFAULT_STOP_TIMEOUT_MS = 5_000;

export const SinterServerState = {
  Stopped: "stopped",
  Starting: "starting",
  Running: "running",
  Stopping: "stopping",
} as const;

export type SinterServerState =
  (typeof SinterServerState)[keyof typeof SinterServerState];

export interface SinterServerAddress {
  host: string;
  port: number;
  family: string;
}

export interface SinterServerStopOptions {
  /**
   * Time to wait for clients to close before their sockets are destroyed.
   */
  readonly timeoutMS?: number;
}

export class ServerLifecycleError extends Error {
  public readonly state: SinterServerState;

  public constructor(state: SinterServerState, message: string) {
    super(message);

    this.name = "ServerLifecycleError";
    this.state = state;
  }
}

export class SinterServer extends EventEmitter {
  public readonly config: Readonly<ServerConfig>;

  private currentCatalog: InMemoryCatalog | undefined;
  private engine: StorageEngine | undefined;
  private netServer: NetServer | undefined;
  private readonly sockets = new Set<Socket>();
  private dispatcher: CommandDispatcher | undefined;
  private committer: GroupCommitter | undefined;
  private currentState: SinterServerState = SinterServerState.Stopped;
  private currentAddress: SinterServerAddress | undefined;
  private stopOperation: Promise<void> | undefined;

  public constructor(
    input: ServerConfigInput = {},
    environment: ServerEnvironment = process.env,
  ) {
    super();

    this.config = resolveServerConfig(input, environment);

    if (this.config.dataDirectory === undefined) {
      this.currentCatalog = new InMemoryCatalog();
      this.dispatcher = new CommandDispatcher(this.currentCatalog);
    }
  }

  /**
   * What the storage engine did when it started: which snapshot it used, any
   * damaged snapshots it skipped, and how much log it replayed. It is only
   * available while a server with a data directory is running.
   */
  public get recovery(): RecoveryReport | undefined {
    return this.engine?.recovery;
  }

  /**
   * The catalog of databases and collections. A server with a data directory
   * only has one once it has started, because starting is when the data is
   * recovered.
   */
  public get catalog(): InMemoryCatalog {
    if (this.currentCatalog === undefined) {
      throw new ServerLifecycleError(
        this.currentState,
        "The catalog is not available until the server has started.",
      );
    }

    return this.currentCatalog;
  }

  public get state(): SinterServerState {
    return this.currentState;
  }

  public get address(): SinterServerAddress | undefined {
    return this.currentAddress;
  }

  public get activeConnectionCount(): number {
    return this.sockets.size;
  }

  public async start(): Promise<SinterServerAddress> {
    if (this.currentState !== SinterServerState.Stopped) {
      throw new ServerLifecycleError(
        this.currentState,
        `Cannot start the server while it is ${this.currentState}.`,
      );
    }

    this.currentState = SinterServerState.Starting;

    if (this.config.dataDirectory !== undefined) {
      try {
        this.engine = StorageEngine.open({
          directory: this.config.dataDirectory,
          writeConcern: this.config.writeConcern,
          groupCommit: this.config.writeConcern === "flushed",
          checkpointRetention: this.config.checkpointKeep,
          backgroundCheckpoints: true,
          ...(this.config.checkpointIntervalSeconds === undefined
            ? {}
            : {
                checkpointIntervalMs:
                  this.config.checkpointIntervalSeconds * 1000,
              }),
          reclaimLock: this.config.reclaimLock,
          ...(this.config.checkpointThresholdBytes === undefined
            ? {}
            : {
                checkpointThresholdBytes: this.config.checkpointThresholdBytes,
              }),
        });
      } catch (error: unknown) {
        this.currentState = SinterServerState.Stopped;

        throw error;
      }

      this.currentCatalog = new InMemoryCatalog(this.engine);
      this.dispatcher = new CommandDispatcher(this.currentCatalog);
      this.committer =
        this.config.writeConcern === "flushed"
          ? new GroupCommitter(this.engine)
          : undefined;
    }

    const server = createServer((socket) => {
      this.trackSocket(socket);
    });

    this.netServer = server;

    try {
      const address = await listen(server, this.config, (error) =>
        this.emit("error", error),
      );

      this.currentAddress = address;
      this.currentState = SinterServerState.Running;

      return address;
    } catch (error: unknown) {
      this.netServer = undefined;
      this.currentAddress = undefined;
      this.currentState = SinterServerState.Stopped;
      this.releaseEngine();

      throw error;
    }
  }

  public async stop(options: SinterServerStopOptions = {}): Promise<void> {
    const timeoutMS = options.timeoutMS ?? DEFAULT_STOP_TIMEOUT_MS;

    if (!Number.isSafeInteger(timeoutMS) || timeoutMS <= 0) {
      throw new TypeError("Stop timeout must be a positive safe integer.");
    }

    if (this.currentState === SinterServerState.Stopped) {
      return;
    }

    if (this.currentState === SinterServerState.Stopping) {
      await this.stopOperation;
      return;
    }

    if (
      this.currentState !== SinterServerState.Running ||
      this.netServer === undefined
    ) {
      throw new ServerLifecycleError(
        this.currentState,
        `Cannot stop the server while it is ${this.currentState}.`,
      );
    }

    this.currentState = SinterServerState.Stopping;

    const server = this.netServer;
    const operation = this.close(server, timeoutMS);

    this.stopOperation = operation;

    let failure: unknown;

    try {
      await operation;
    } catch (error: unknown) {
      failure = error;
    } finally {
      this.netServer = undefined;
      this.currentAddress = undefined;
      this.stopOperation = undefined;
      this.currentState = SinterServerState.Stopped;
    }

    try {
      this.releaseEngine();
    } catch (error: unknown) {
      failure ??= error;
    }

    if (failure !== undefined) {
      throw failure;
    }
  }

  private releaseEngine(): void {
    const engine = this.engine;

    if (engine === undefined) {
      return;
    }

    this.engine = undefined;
    this.currentCatalog = undefined;
    this.dispatcher = undefined;
    this.committer = undefined;

    engine.close();
  }

  private trackSocket(socket: Socket): void {
    this.sockets.add(socket);

    new ServerSession(socket, {
      dispatcher: this.dispatcher as CommandDispatcher,
      ...(this.committer === undefined ? {} : { durability: this.committer }),
      onError: (error) => this.emit("error", error),
      onConnectionError: (error) => this.emit("connectionError", error),
      ...(this.config.logOperations
        ? { onCommand: (event) => this.emit("command", event) }
        : {}),
    });

    socket.once("close", () => {
      this.sockets.delete(socket);
    });
  }

  private async close(server: NetServer, timeoutMS: number): Promise<void> {
    const sockets = [...this.sockets];
    const socketClosures = sockets.map(waitForSocketClose);

    const serverClosed = new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error !== undefined) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    for (const socket of sockets) {
      socket.end();
    }

    const forceTimer = setTimeout(() => {
      for (const socket of sockets) {
        if (!socket.destroyed) {
          socket.destroy();
        }
      }
    }, timeoutMS);

    try {
      await Promise.all([serverClosed, ...socketClosures]);
    } finally {
      clearTimeout(forceTimer);
    }
  }
}

async function listen(
  server: NetServer,
  config: Readonly<ServerConfig>,
  onRuntimeError: (error: Error) => void,
): Promise<SinterServerAddress> {
  return await new Promise<SinterServerAddress>((resolve, reject) => {
    const handleStartupError = (error: Error): void => {
      server.off("listening", handleListening);
      reject(error);
    };

    const handleListening = (): void => {
      server.off("error", handleStartupError);
      server.on("error", onRuntimeError);

      const address = server.address();

      if (address === null || typeof address === "string") {
        reject(
          new ServerLifecycleError(
            SinterServerState.Starting,
            "The TCP server did not provide an IP address.",
          ),
        );
        return;
      }

      resolve(toServerAddress(address));
    };

    server.once("error", handleStartupError);
    server.once("listening", handleListening);

    server.listen({
      host: config.host,
      port: config.port,
    });
  });
}

function toServerAddress(address: AddressInfo): SinterServerAddress {
  return {
    host: address.address,
    port: address.port,
    family: address.family,
  };
}

function waitForSocketClose(socket: Socket): Promise<void> {
  if (socket.closed) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    socket.once("close", () => resolve());
  });
}
