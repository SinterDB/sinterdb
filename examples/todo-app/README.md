# To-do app example

A small command-line to-do list written in TypeScript on the
[`sinterdb`](../../packages/driver) driver. It is the example application for
the `0.1.0` developer preview and shows the everyday pieces in about 400 lines:

- connecting with a connection string, and handling `error` events
- a typed collection (`collection<Todo>`) so filters and updates are checked
- unique and plain indexes, created on every start (this is safe to repeat)
- `insertOne`, `updateOne` with `$set` and `$addToSet`, `deleteOne`,
  `deleteMany`
- `find` with a filter, a two-field sort, a `limit`, and `for await`
- catching a `DuplicateKey` server error from a unique index

The database code is in [`src/todos.ts`](./src/todos.ts). The command-line
handling is in [`src/main.ts`](./src/main.ts).

## Run it

You need Node.js 24 or later, which runs the `.ts` files directly. From the
root of this repository:

```bash
pnpm install
pnpm build
node apps/server-cli/dist/index.js --data-dir ./sinterdb-data
```

In a second terminal:

```bash
cd examples/todo-app
node src/main.ts add "Write the docs" --priority 2 --tag docs
node src/main.ts add "Ship 0.1.0" --priority 1
node src/main.ts list
node src/main.ts done "Ship 0.1.0"
node src/main.ts stats
```

Stop the server with Ctrl+C, start it again with the same command, and run
`node src/main.ts list --all`. The items are still there.

By default the app connects to `sinterdb://127.0.0.1:4721/todo`. Set
`SINTERDB_URL` to use another server or database.

## Use it in your own project

Copy `src/todos.ts` and `src/main.ts`, then run `npm install sinterdb`.
Because Node strips types without compiling them, the code avoids TypeScript
syntax that needs a compiler (such as constructor parameter properties). The
[`tsconfig.json`](./tsconfig.json) turns on `erasableSyntaxOnly` so that the
compiler tells you if that ever slips.

## Tests

`pnpm test` in this folder starts the built `sinterd` binary on a temporary
data directory, runs the app as a separate process for every command, restarts
the server, and checks that the data is still there. It needs `pnpm build`
first.
