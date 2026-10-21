# Quick start

This guide takes you from nothing to a running SinterDB server and a small
TypeScript program that stores documents, restarts the server, and finds the
data still there. It takes about five minutes.

You need **Node.js 24 or later**.

> SinterDB `0.2.0` is a developer preview. The APIs and the protocol may still
> change before `1.0.0`.

## 1. Install the server

The server is the `@sinterdb/cli` package. It installs one command, `sinterd`.

```bash
npm install --global @sinterdb/cli
```

With pnpm, use `pnpm add --global @sinterdb/cli`.

Prefer a container? See [Running in Docker](./docker.md), then continue at step 3.

## 2. Start the server

```bash run=server
sinterd --data-dir ./sinterdb-data
```

`--data-dir` is what makes your data survive a restart. Without it, the server
keeps everything in memory and loses it when it stops.

The server prints one JSON line when it is ready, and the line includes
`"storage":"disk"`. Leave it running and open a second terminal for the next
steps.

By default the server listens on `127.0.0.1:4721`, so only programs on your own
machine can reach it. SinterDB has no authentication or TLS yet, so do not open
it to a network you do not trust. All settings are listed in
[configuration.md](./configuration.md).

## 3. Create a project

```bash
mkdir todo
cd todo
npm init -y
npm pkg set type=module
npm install sinterdb
```

## 4. Store and query documents

Create `app.ts`:

```ts file=app.ts
import { SinterClient } from "sinterdb";

interface Task {
  title: string;
  done: boolean;
  priority: number;
}

const client = new SinterClient("sinterdb://localhost/todo");
await client.connect();

try {
  const tasks = client.db().collection<Task>("tasks");

  const inserted = await tasks.insertMany([
    { title: "Install SinterDB", done: true, priority: 1 },
    { title: "Write a document", done: false, priority: 2 },
    { title: "Restart the server", done: false, priority: 3 },
  ]);
  console.log(`Inserted ${inserted.insertedCount} tasks.`);

  const updated = await tasks.updateOne(
    { title: "Write a document" },
    { $set: { done: true } },
  );
  console.log(`Marked ${updated.modifiedCount} task as done.`);

  const deleted = await tasks.deleteOne({ title: "Install SinterDB" });
  console.log(`Deleted ${deleted.deletedCount} task.`);

  console.log("Tasks by priority:");
  for await (const task of tasks.find({}, { sort: [["priority", 1]] })) {
    console.log(`- [${task.done ? "x" : " "}] ${task.title}`);
  }
} finally {
  await client.close();
}
```

Run it. Node.js 24 runs TypeScript files directly.

```bash
node app.ts
```

It prints:

```text expect=app.ts
Inserted 3 tasks.
Marked 1 task as done.
Deleted 1 task.
Tasks by priority:
- [x] Write a document
- [ ] Restart the server
```

A few things to notice:

- `sinterdb://localhost/todo` names the server and, after the last `/`, the
  database. Databases and collections are created the first time you write to
  them. See [connection-strings.md](./connection-strings.md).
- `collection<Task>` types the documents. Filters, updates, and sorts are
  checked against `Task`, so a misspelled field is a compile error.
- Every document gets a unique `_id` when you do not supply one.

## 5. Restart the server and recover your data

Go back to the first terminal and press Ctrl+C. The server stops cleanly and
writes a final checkpoint. Start it again with the same command:

```bash
sinterd --data-dir ./sinterdb-data
```

On startup the server recovers the data from `./sinterdb-data`. Now create
`recover.ts` in your project:

```ts file=recover.ts
import { SinterClient } from "sinterdb";

interface Task {
  title: string;
  done: boolean;
  priority: number;
}

const client = new SinterClient("sinterdb://localhost/todo");
await client.connect();

try {
  const tasks = await client.db().collection<Task>("tasks").find().toArray();

  console.log(`Found ${tasks.length} tasks after the restart:`);
  for (const task of tasks) {
    console.log(`- ${task.title}`);
  }
} finally {
  await client.close();
}
```

Run it:

```bash
node recover.ts
```

```text expect=recover.ts
Found 2 tasks after the restart:
- Write a document
- Restart the server
```

Your data survived the restart. It also survives the server being killed
mid-write: the write-ahead log is replayed the next time the server starts. See
[storage.md](./storage.md) for how recovery works and what it can and cannot
promise.

## If something goes wrong

When the server cannot start, it writes a `server.start_failed` line to standard
error with the reason, and exits with code 1.

- **The program fails with a connection error.** The server is not running, or
  it is listening somewhere else. Check that the first terminal still shows the
  server, and that the port in the connection string matches `--port`.
- **The server exits with `EADDRINUSE`.** Another program uses port 4721. Start
  the server with `--port 4722` and use `sinterdb://localhost:4722/todo`.
- **The server exits with "The data directory is in use".** Another `sinterd` is
  using the same `--data-dir`. Stop it first. A lock left behind by a process
  that no longer exists is taken over automatically.
- **Your data is gone after a restart.** The server was started without
  `--data-dir`, or with a different one.
- **`node app.ts` fails.** Check `node --version`. Running TypeScript files
  directly needs a recent Node.js, and this guide needs 24 or later.

## Next steps

- [Configuration reference](./configuration.md): every server and driver option.
- [Indexes](./indexes.md): make queries fast and enforce unique values.
- [Aggregation](./aggregation.md): count, sort, page and reshape results.
- [Query budgets](./query-budgets.md): cap the time and documents a query may cost.
- [Storage](./storage.md): durability, checkpoints, and recovery.
- [Running in Docker](./docker.md): the server in a container, with a volume.
- [Known limitations](./limitations.md): what SinterDB does not do yet.
- [Benchmarks](./benchmarks.md): what the everyday operations cost.
- [Compatibility](./compatibility.md): what stays stable between releases.
