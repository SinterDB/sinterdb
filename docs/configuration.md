# Configuration reference

This page lists every setting of the SinterDB server (`sinterd`, from the
`@sinterdb/cli` package) and the driver (`sinterdb`). Tests compare it with the
code, so an option that is missing here fails the build.

For connection strings, see [connection-strings.md](./connection-strings.md).

## Server

Start the server with options on the command line, in environment variables, in
a [config file](#config-file), or any mix of them. When several are set, **the
command line wins**, then the environment, then the config file, then the
default.

| Option                       | Flag                             | Environment variable           | Default     |
| ---------------------------- | -------------------------------- | ------------------------------ | ----------- |
| Listening address            | `--host <host>`                  | `SINTERDB_HOST`                | `127.0.0.1` |
| Listening port               | `-p, --port <port>`              | `SINTERDB_PORT`                | `4721`      |
| Data directory               | `--data-dir <path>`              | `SINTERDB_DATA_DIR`            | none        |
| Write concern                | `--write-concern <level>`        | `SINTERDB_WRITE_CONCERN`       | `flushed`   |
| Durability mode (deprecated) | `--durability <mode>`            | `SINTERDB_DURABILITY`          | none        |
| Checkpoint threshold         | `--checkpoint-bytes <n>`         | `SINTERDB_CHECKPOINT_BYTES`    | `64 MiB`    |
| Checkpoint interval          | `--checkpoint-interval <seconds` | `SINTERDB_CHECKPOINT_INTERVAL` | none        |
| Snapshots kept               | `--checkpoint-keep <n>`          | `SINTERDB_CHECKPOINT_KEEP`     | `2`         |
| Reclaim lock                 | `--reclaim-lock`                 | `SINTERDB_RECLAIM_LOCK`        | `false`     |
| Operation log                | `--log-operations`               | `SINTERDB_LOG_OPERATIONS`      | `false`     |
| Config file                  | `--config <path>`                | none                           | see below   |
| Interactive console          | `--no-ui` turns it off           | none                           | see below   |

Two more flags do not start a server: `-h, --help` prints the usage text, and
`-v, --version` prints the server version.

### Host and port

The server listens on `127.0.0.1` by default, so only programs on the same
machine can connect. Use `--host 0.0.0.0` (all IPv4 interfaces) or `--host ::`
(all interfaces) to accept connections from other machines or from outside a
container.

> **Authentication and TLS are not implemented yet.** Anyone who can reach the
> port can read and change every database. Only listen on a network you trust,
> and put a firewall or a private network in front of the server.

`--port 0` lets the operating system pick a free port. The `server.started` log
line reports the port that was chosen. The port must be an integer from 0 to 65535.

### Data directory

Without `--data-dir`, the server keeps everything in memory and **loses all
data when it stops**. With it, writes go to a write-ahead log in that directory
and survive a restart. The directory is created if it does not exist, and a
second server cannot open a directory that another is using. See
[storage.md](./storage.md) for the layout and recovery.

`--write-concern`, `--durability`, `--checkpoint-bytes`, `--checkpoint-interval`,
`--checkpoint-keep` and `--reclaim-lock` only make sense with a data directory.
Setting any of them without `--data-dir` is a configuration
error.

`--reclaim-lock` (or `SINTERDB_RECLAIM_LOCK=true`) makes the server take over a
lock that a process on another host or container left behind. Leave it off
unless the directory is only ever used by one server at a time and the host name
changes between runs, which is the case for containers. The Docker image turns
it on. See [the data directory lock](./storage.md#the-data-directory-lock).

### Operation log

`--log-operations` (or `SINTERDB_LOG_OPERATIONS=true`) logs one `operation`
event for every command the server runs. It works with or without a data
directory, and it is off by default, so a server that does not use it does no
extra work and prints exactly what it printed before.

```json
{
  "timestamp": "2026-10-22T01:50:12.431Z",
  "level": "info",
  "event": "operation",
  "message": "find app.users",
  "details": {
    "command": "find",
    "database": "app",
    "collection": "users",
    "durationMs": 0.412,
    "ok": true
  }
}
```

| Detail       | Meaning                                                                         |
| ------------ | ------------------------------------------------------------------------------- |
| `command`    | The command name, such as `find`, `insertOne` or `aggregate`.                   |
| `database`   | The database it ran in. Left out for server-wide commands.                      |
| `collection` | The collection it used. Left out when the command has none.                     |
| `durationMs` | Milliseconds the server spent running it. It excludes waiting for a flush.      |
| `ok`         | `true` when the command worked.                                                 |
| `error`      | The error name when it failed, such as `DuplicateKey`. Left out when it worked. |

A command that fails because of the request (a duplicate key, a bad filter, an
unknown command) logs at level `warn`, because the server is fine. Both levels
go to standard output so the lines of one run stay in order. On a terminal the
same event prints as readable, colored lines.

The same option also logs each client connection as `connection.opened` and
`connection.closed`, with the connection's `id` (counting up from 1 for each
run of the server), its `remoteAddress`, and how many connections are `active`
afterwards.

Document contents and filters are never logged. A busy server writes a lot of
lines with this on.

### Write concern

| Level       | A write is acknowledged when...                             | Survives a server crash          | Survives power loss |
| ----------- | ----------------------------------------------------------- | -------------------------------- | ------------------- |
| `flushed`   | it has reached stable storage                               | yes                              | yes                 |
| `journaled` | it has reached the operating system                         | yes                              | no, may be lost     |
| `memory`    | it has been applied in memory, and is logged within ~100 ms | no, the last ~100 ms may be lost | no, may be lost     |

`flushed` is the default and the safe choice. `journaled` is faster and fits
data you can recreate. `memory` is the fastest and fits caches and scratch data.
A clean stop writes everything pending at every level.

`--durability` and `SINTERDB_DURABILITY` are the deprecated names from 0.1.0.
They still work: `fsync` means `flushed` and `buffered` means `journaled`. Set
only one of the two.

### Checkpoints

`--checkpoint-bytes` is how many bytes of log the server writes before it takes
an automatic checkpoint. It must be a positive integer. A checkpoint is also
taken when the server stops cleanly. A larger value means fewer checkpoints but
more log to replay after a crash.

`--checkpoint-interval` adds a clock to the size rule. The server also takes a
checkpoint every that many seconds, but only when something was written since the
last one, so an idle server does no work. It must be a whole number of seconds
from 1 to 2000000. Without it, only the size rule and a clean stop take
checkpoints.

`--checkpoint-keep` is how many snapshots stay on disk after a checkpoint, from 2
to 100. The server also keeps the log since the oldest kept snapshot, so keeping
more snapshots uses more disk and gives recovery more older states to fall back
on if the newest ones are damaged. Two is the smallest allowed value, because two
is what makes a damaged newest snapshot recoverable.

### Interactive console

Run `sinterd` with no options in a terminal and it opens a full-screen console
instead of starting a server in that terminal. The console starts stopped. It
runs the server as a separate process, the same `sinterd` that a service or a
container runs, with `--log-operations` added so it can show each command.

The console opens only when all of these are true:

- standard input, output and error are all terminals, and `TERM` is not `dumb`;
- no server option is given on the command line (`--config` is fine), and no
  `SINTERDB_*` environment variable is set;
- `--no-ui` is not given, and the config file does not say `"ui": false`.

Everything else starts a server exactly as before, so Docker, systemd, CI and
every script that passes options are not affected. A script that ran a bare
`sinterd` from a terminal needs `--no-ui` (or any option) to keep that
behavior.

The top of the screen shows the server state, address and process id, then how
long it has been up, the open connections, the commands run (with a rate over
the last 5 seconds) and how many failed. Below that is the log, then the
keys, then a line for typing.

| Key                                  | What it does                                                   |
| ------------------------------------ | -------------------------------------------------------------- |
| `s`, `x`, `r`                        | Start, stop or restart the server.                             |
| `p`                                  | Pause or resume the log. Lines still arrive.                   |
| `l`                                  | Cycle between all lines, warnings and errors, and errors only. |
| `/`                                  | Show only lines that contain some text.                        |
| `f`, `End`                           | Follow the newest line again.                                  |
| `Up`, `Down`, `PgUp`, `PgDn`, `Home` | Scroll the log.                                                |
| `c`                                  | Clear the log.                                                 |
| `:`                                  | Type a command. See `help` for the list.                       |
| `?`                                  | Show the help panel. `Esc` closes it.                          |
| `q`, `Ctrl+C`                        | Quit. A running server is stopped first.                       |

The log keeps the newest 1000 lines. The console needs a terminal of at least
60 columns and 16 rows, and says so when it is smaller. It gives the screen
back when it quits, when it gets `SIGINT`, `SIGTERM` or `SIGHUP`, and when it
fails.

### Config file

A config file keeps settings so you do not have to type them every time. It is
a JSON object, and every key is optional:

```json
{
  "host": "0.0.0.0",
  "port": 4721,
  "dataDir": "/var/lib/sinterdb",
  "writeConcern": "flushed",
  "checkpointBytes": 67108864,
  "checkpointInterval": 300,
  "checkpointKeep": 2,
  "reclaimLock": false,
  "logOperations": false,
  "ui": true
}
```

| Key                  | Type    | Same as                 |
| -------------------- | ------- | ----------------------- |
| `host`               | string  | `--host`                |
| `port`               | number  | `--port`                |
| `dataDir`            | string  | `--data-dir`            |
| `writeConcern`       | string  | `--write-concern`       |
| `checkpointBytes`    | number  | `--checkpoint-bytes`    |
| `checkpointInterval` | number  | `--checkpoint-interval` |
| `checkpointKeep`     | number  | `--checkpoint-keep`     |
| `reclaimLock`        | boolean | `--reclaim-lock`        |
| `logOperations`      | boolean | `--log-operations`      |
| `ui`                 | boolean | `--no-ui` turns it off  |

The server reads `$XDG_CONFIG_HOME/sinterdb/config.json`, or
`~/.config/sinterdb/config.json` when `XDG_CONFIG_HOME` is not set
(`%APPDATA%\sinterdb\config.json` on Windows). `--config <path>` reads another
file instead, and the server refuses to start when that file does not exist. A
missing default file is the same as an empty one, so a server without a config
file starts exactly as before. When a file was read, the `server.started` event
reports its path as `configFile`.

An invalid file stops the server from starting, and the message names the file
and the setting: invalid JSON, an unknown key, a value of the wrong type, or a
value the server would refuse on the command line.

`writeConcern`, `checkpointBytes`, `checkpointInterval`, `checkpointKeep` and
`reclaimLock` only apply with a data directory. A value for one of them in the
file is ignored when no data directory is set by a flag, a variable or the file
itself, and while the deprecated `--durability` is set, so a shared file never
stops an in-memory server from starting. `sinterd config list` shows which file
values are in use.

Manage the file with the `config` command instead of editing it by hand:

| Command                            | What it does                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| `sinterd config list`              | Every key with its effective value and where the value comes from.            |
| `sinterd config get <key>`         | Prints one effective value. Exits with `1` and prints nothing if none is set. |
| `sinterd config set <key> <value>` | Checks the value with the server's own rules, then saves it.                  |
| `sinterd config unset <key>`       | Removes the key from the file.                                                |
| `sinterd config path`              | Prints the file in use.                                                       |

All of them accept `--config <path>`. A running server does not notice changes:
they take effect the next time it starts, and `set` and `unset` say so. When an
environment variable sets the same key, `set` also warns that the variable
overrides the file. The `backup`, `restore`, `inspect` and `repair` commands do
not read the config file.

### Stopping the server

`SIGINT` (Ctrl+C) and `SIGTERM` stop the server cleanly. It stops accepting new
connections and closes the existing ones, dropping any that are still open after
5 seconds. It then closes the storage engine, which writes a final checkpoint
when a data directory is set. A client that is connected at that moment sees its
connection close, so it cannot know whether a request that was in flight was
applied. A server that is killed (`SIGKILL`, power loss) recovers from the log
at its next start.

### Exit codes

| Code | Meaning                                                        |
| ---- | -------------------------------------------------------------- |
| `0`  | The server stopped cleanly, or `--help` / `--version` ran.     |
| `1`  | The server could not start, or hit an error while running.     |
| `2`  | The command line was invalid (unknown flag, bad `--help` use). |

A bad value such as `--port nope` is reported as a start failure (`1`) with the
reason in the log.

### Log output

When standard output and standard error are both terminals, the server prints
readable, colored log entries: the time, the level, the event name and the
message on one line, then the details underneath. Anywhere else, such as a file,
a pipe or `docker logs` without a terminal, it writes one JSON object per line.
There is no flag for this: the choice follows where the output goes.

Colors follow the usual conventions. Set `NO_COLOR` to turn them off, or
`FORCE_COLOR` to turn them on even when output is not a terminal. The
`inspect`, `repair`, `backup`, `restore` and `verify-backup` commands use the
same rules.

The JSON form writes informational events to standard
output, and warnings and errors to standard error. A client that disconnects
abruptly is logged as a `server.connection_error` warning and does not stop the
server; an `error` line with a `server.runtime_error` event does. The fields of a line are `timestamp`,
`level`, `event`, `message`, and `details`. The `server.started` event reports
the address and, with a data directory, what recovery did. The log format is
meant for people and is not covered by the compatibility promise in
[compatibility.md](./compatibility.md).

## Driver

`new SinterClient(connectionString, options)` accepts these options. Times are
in milliseconds.

| Option             | Default | Valid values             | Meaning                                                            |
| ------------------ | ------- | ------------------------ | ------------------------------------------------------------------ |
| `connectTimeoutMS` | `10000` | integer, 1 to 2147483647 | How long `connect()` waits for the connection and handshake.       |
| `requestTimeoutMS` | `10000` | integer, 1 to 2147483647 | How long one command waits for its response.                       |
| `socketTimeoutMS`  | `0`     | integer, 0 to 2147483647 | Close the connection after this long without any data. `0` is off. |

An out-of-range value throws `SinterClientOptionsError` from the constructor.

The database a client uses comes from its connection string
(`sinterdb://host/app`) or from `client.db("app")`. With neither,
`client.db()` throws `SinterNamespaceError`.

## Limits

| Limit                                   | Value          |
| --------------------------------------- | -------------- |
| Database and collection name length     | 255 bytes      |
| Size of one request or response payload | 16 MiB         |
| Nesting depth of a document             | 100 levels     |
| Indexes per collection                  | 32, plus `_id` |
| Index name length                       | 127 characters |
