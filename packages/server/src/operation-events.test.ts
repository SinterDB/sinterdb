import { connect, type Socket } from "node:net";

import {
  CustomId,
  encodeMessage,
  HandshakeRole,
  MessageKind,
  MessageStreamDecoder,
  PROTOCOL_VERSION,
  type DecodedMessage,
} from "sinterdb-protocol";
import { afterEach, describe, expect, it } from "vitest";

import type { ServerCommandEvent } from "./session.js";
import { SinterServer } from "./server.js";

// With logOperations on, the server emits one `command` event for every
// command it runs. With it off, nothing is timed and nothing is emitted.

let server: SinterServer | undefined;
let client: Socket | undefined;

afterEach(async () => {
  client?.destroy();
  await server?.stop();
  server = undefined;
  client = undefined;
});

async function start(
  logOperations: boolean,
): Promise<{ events: ServerCommandEvent[]; send: Sender }> {
  server = new SinterServer({ port: 0, logOperations }, {});

  const events: ServerCommandEvent[] = [];

  server.on("command", (event: ServerCommandEvent) => events.push(event));

  const address = await server.start();

  client = await new Promise<Socket>((resolve, reject) => {
    const socket = connect({ host: address.host, port: address.port });

    socket.once("connect", () => resolve(socket));
    socket.once("error", reject);
  });

  const socket = client;
  const decoder = new MessageStreamDecoder();
  const waiting: ((message: DecodedMessage) => void)[] = [];

  socket.on("data", (chunk: Uint8Array) => {
    for (const message of decoder.push(chunk)) {
      waiting.shift()?.(message);
    }
  });

  let requestId = 0;
  const send: Sender = (input) =>
    new Promise<DecodedMessage>((resolve) => {
      requestId += 1;
      waiting.push(resolve);
      socket.write(
        encodeMessage({ ...input, requestId } as unknown as Parameters<
          typeof encodeMessage
        >[0]),
      );
    });

  await send({
    kind: MessageKind.Handshake,
    payload: {
      role: HandshakeRole.Client,
      protocolVersion: PROTOCOL_VERSION,
      product: "test",
      productVersion: "0.0.0",
      capabilities: [],
    },
  });

  return { events, send };
}

type Sender = (
  input:
    | { kind: typeof MessageKind.Handshake; payload: Record<string, unknown> }
    | { kind: typeof MessageKind.Command; payload: Record<string, unknown> },
) => Promise<DecodedMessage>;

function command(
  name: string,
  database: string | undefined,
  parameters: Record<string, unknown>,
): Parameters<Sender>[0] {
  return {
    kind: MessageKind.Command,
    payload: {
      command: name,
      ...(database === undefined ? {} : { database }),
      parameters,
    },
  };
}

describe("operation events", () => {
  it("reports a command that worked", async () => {
    const { events, send } = await start(true);

    await send(
      command("insertOne", "app", {
        collection: "users",
        document: { name: "Ada" },
      }),
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      command: "insertOne",
      database: "app",
      collection: "users",
      ok: true,
    });
    expect(events[0]?.durationMs).toBeGreaterThanOrEqual(0);
    expect(events[0]).not.toHaveProperty("error");
  });

  it("reports a command that failed, with the error name", async () => {
    const { events, send } = await start(true);

    const _id = CustomId.generate();

    await send(command("noSuchCommand", "app", {}));
    await send(
      command("insertOne", "app", {
        collection: "users",
        document: { _id, name: "Ada" },
      }),
    );
    await send(
      command("insertOne", "app", {
        collection: "users",
        document: { _id, name: "Grace" },
      }),
    );

    expect(
      events.map((event) => [event.command, event.ok, event.error]),
    ).toEqual([
      ["noSuchCommand", false, "UnknownCommand"],
      ["insertOne", true, undefined],
      ["insertOne", false, "DuplicateKey"],
    ]);
  });

  it("leaves out the database and collection when a command has none", async () => {
    const { events, send } = await start(true);

    await send(command("listDatabases", undefined, {}));

    expect(events[0]).toMatchObject({ command: "listDatabases", ok: true });
    expect(events[0]).not.toHaveProperty("database");
    expect(events[0]).not.toHaveProperty("collection");
  });

  it("emits nothing unless logOperations is on", async () => {
    const { events, send } = await start(false);

    await send(command("listDatabases", undefined, {}));

    expect(events).toEqual([]);
  });

  it("still answers a command when the listener throws", async () => {
    const { send } = await start(true);

    server?.on("command", () => {
      throw new Error("the listener broke");
    });

    const reply = await send(command("listDatabases", undefined, {}));

    expect(reply.kind).toBe(MessageKind.Result);
  });

  it("takes the setting from the environment", () => {
    expect(
      new SinterServer({}, { SINTERDB_LOG_OPERATIONS: "true" }).config
        .logOperations,
    ).toBe(true);
  });
});
