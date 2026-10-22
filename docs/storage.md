# Durable Storage

SinterDB can keep its data on disk so that acknowledged writes survive a
restart or a crash. Storage is opt-in: without a data directory the server
keeps everything in memory and loses it on shutdown.

```sh
sinterd --data-dir ./data
```

## What is stored

All documents are kept in memory while the server runs. The data directory is
how they are made durable and reloaded, so the whole dataset must fit in
memory.

```text
data/
├── LOCK              process lock, present while a server uses the directory
├── manifest.json     storage format and version
├── wal/              write-ahead log segments (00000000000000000001.wal, ...)
├── checkpoints/      snapshots (00000000000000000123.snap, ...)
├── segments/         reserved for a later version
└── indexes/          reserved for a later version
```

Do not edit these files by hand.

## How a write becomes durable

1. The server validates the request and works out the complete result of the
   operation.
2. It appends one record to the write-ahead log. An operation that changes
   several documents, such as `insertMany`, `updateMany` or `deleteMany`, is a
   single record, so it is applied completely or not at all.
3. It applies the change to memory.
4. It acknowledges the write to the client.

If step 2 fails, the change is not applied to memory and the client receives an
error. Every record carries checksums and a sequence number.

## Write concerns

Choose a level with `--write-concern <level>` or `SINTERDB_WRITE_CONCERN`.

| Level               | A write is acknowledged when...                                 | Survives a server crash          | Survives power loss or an operating-system crash |
| ------------------- | --------------------------------------------------------------- | -------------------------------- | ------------------------------------------------ |
| `flushed` (default) | the log has been flushed to stable storage                      | Yes                              | Yes, if the storage hardware honors flushes      |
| `journaled`         | the log write has reached the operating system                  | Yes                              | No. Recent writes can be lost                    |
| `memory`            | it is applied in memory; the log is written within about 100 ms | No. The last ~100 ms can be lost | No. Recent writes can be lost                    |

`journaled` and `memory` are faster. Use `flushed` for data you cannot afford to
lose. With `memory`, records wait in the server until 64 KiB are pending, 100
milliseconds pass, a checkpoint starts or the server stops cleanly, whichever
comes first. The log is never reordered: after a crash you recover a prefix of
the writes, not a mixture.

The older `--durability` flag and `SINTERDB_DURABILITY` still work. `fsync` means
`flushed` and `buffered` means `journaled`.

### Group commit

With `flushed`, the server does not flush once per write. Writes that arrive in
the same turn of the event loop, from one connection or many, share one flush.
The server holds every reply until that flush is done, so a write you were told
succeeded is always on stable storage. Nothing to configure: it is on for
`flushed` and does not exist for the other levels.

Two things follow from it. A single client doing one write at a time sees no
change. Many clients, or one client with many requests in flight, get more
writes per second, because the flush is the slow part.

A reply to a read is also held while writes are waiting for a flush, so nobody is
ever shown data that a crash could still take away. If the flush fails, the server
closes the connections whose replies were waiting instead of reporting success.

> [!NOTE]
> The automated crash tests terminate the server with `SIGKILL` and verify
> that recovery is exact. They cannot simulate losing power, so protection
> against power loss in `flushed` mode rests on the engine flushing at the right
> moments: after each log append, when creating a log segment, and when
> publishing a snapshot or removing files.

## Checkpoints and compaction

Replaying a long log would make restarts slow and the log would grow forever,
so the server periodically writes a snapshot of all collections, called a
checkpoint, and then removes log segments it no longer needs.

- A checkpoint is taken automatically after `--checkpoint-bytes` bytes of log
  (default 64 MiB), and once more on a clean shutdown so the next start has
  almost nothing to replay.
- A snapshot is written to a temporary file, flushed, and atomically renamed, so
  a crash never leaves a half-written snapshot in place.
- A checkpoint is also taken every `--checkpoint-interval` seconds when that is
  set, but only if something was written since the last one.
- The two newest snapshots are kept by default, together with the log since the
  older one. `--checkpoint-keep <n>` keeps more, up to 100. If the newest
  snapshot is ever damaged, recovery falls back to the next one plus the log and
  loses nothing. This also means the first checkpoint frees no log space, and
  disk use can reach two to three times the data size, more with a larger
  `--checkpoint-keep`.
- `manifest.json` is replaced the same way as a snapshot: written to a temporary
  file, flushed, renamed over the old one, and the directory flushed. A crash in
  the middle leaves the old manifest intact. A leftover `manifest.json.tmp` is
  deleted on the next start.
- Automatic checkpoints run in the background. The server copies the list of
  documents at the moment the checkpoint starts, then writes the snapshot about
  1 MiB at a time and lets other requests run in between, so a large data set
  does not stop reads and writes while it is saved. Writes made meanwhile go to
  the log and are not in that snapshot, so recovery replays them. The log is
  truncated only after the snapshot is complete.
- The copy of the document list costs a little memory while a checkpoint runs,
  roughly one pointer per document. Documents themselves are not copied.
- A checkpoint that is still running when the server stops is cancelled and its
  unfinished file removed. The final checkpoint on a clean shutdown is written in
  one go, with the server already refusing new work.
- Only one checkpoint runs at a time. If the next one is due while one is
  running, it waits until that one finishes.
- A checkpoint only starts between writes, never in the middle of one.
- A failed automatic checkpoint never fails a write. The server tries again
  after another threshold's worth of log.

## Recovery

On start the server:

1. Takes the lock on the data directory.
2. Checks `manifest.json`.
3. Opens the log, repairing an incomplete final record left by a crash.
4. Loads the newest valid snapshot and replays only the log after it.
5. Starts listening.

The `server.started` log line reports what happened: `checkpointLsn`,
`replayedRecords`, and `skippedCheckpoints`, which lists any damaged snapshots
that were not used and why.

### Crashes

A crash can leave the last log record incomplete. That is expected and is
dropped silently, so a write that was never acknowledged simply does not
happen. Everything acknowledged before the crash is recovered.

### Corruption

If a record in the middle of the log, a snapshot, or the manifest is damaged,
the server refuses to start rather than guess. The error names the file, the
byte offset and the log sequence number. The recovery code is designed never
to start with data that did not exist at some point in the past, and never to
edit a log it cannot trust. The fault-injection tests check this by damaging
files at random.

| Startup error mentions                 | Meaning                                                              | What to do                                                                            |
| -------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `The data directory is in use`         | Another server holds the lock                                        | Stop it. Remove `LOCK` only if you are certain no SinterDB process uses the directory |
| `write-ahead log is corrupt`           | A log record failed its checksum, or a segment is missing            | Restore the directory from a backup                                                   |
| `cannot be recovered`                  | Every snapshot is damaged and the log before them was compacted away | Restore from a backup                                                                 |
| `lost records`                         | The log ends before the newest snapshot                              | Restore from a backup                                                                 |
| `no manifest.json` or `not valid JSON` | The manifest is missing or damaged                                   | Restore `manifest.json` from a backup                                                 |
| `Upgrade` or `newer version`           | The data was written by a newer SinterDB                             | Run the newer version                                                                 |
| `cannot be rebuilt`                    | A recorded index cannot be built from the recovered documents        | Restore from a backup                                                                 |

Run `sinterd inspect --data-dir <path>` to see exactly what is damaged without
changing anything, and `sinterd repair` to see what can be fixed. Restoring a
backup is still the better answer when you have one. See
[repair.md](./repair.md).

## The data directory lock

Only one server may use a data directory. `LOCK` records the process id and
host. After a crash, the next server on the same host notices the process is
gone and takes the lock over. The lock is a file, not an operating-system
lock, so it cannot protect a directory shared over a network file system, and
it can be fooled if the operating system reuses a process id.

A lock written on a different host is never taken over unless you ask for it,
because the server cannot tell whether that process is still running. Start the
server with `--reclaim-lock` (or `SINTERDB_RECLAIM_LOCK=true`) when you know it
is not. Containers need this, because each one has its own host name; the
[Docker image](./docker.md) sets it for you.

## Indexes

Index definitions are part of the stored data. `createIndex` and `dropIndex` are
log records, and each snapshot lists the index definitions of every collection.
The indexes themselves are rebuilt from the documents on every start, so they
add very little to the data directory. See [Indexes](./indexes.md).

If a unique index recorded in the log cannot be rebuilt because the recovered
documents violate it, the server refuses to start and names the collection. This
only happens when the data is damaged.

## Storage format versions

The data directory records a format version in `manifest.json`.

| Version | Written by | Contents                                        |
| ------: | ---------- | ----------------------------------------------- |
|       1 | 0.0.8      | Documents and collections                       |
|       2 | 0.0.9      | Adds index definitions to the log and snapshots |
|       3 | 0.3.0      | An index definition can cover several fields    |

A version 1 directory is upgraded to version 2 in place the first time 0.0.9
opens it, before anything is written. The manifest then records `upgradedFrom`.
Version 1 snapshots and logs are still read.

The same happens for a version 2 directory the first time 0.3.0 opens it.
Nothing needs rewriting, because a version 2 index definition is already a
valid single-field definition in version 3.

The upgrade is one way. A 0.0.8 server refuses a version 2 directory, and a
0.2.0 server refuses a version 3 directory, with an "Upgrade" error instead of
ignoring the indexes. Make a backup before upgrading if you may want to go
back.

### How upgrades work

Every format change is a numbered step from one version to the next. Opening an
older directory runs the steps from its version up to the current one, in
order, before the log is read, and then records `upgradedFrom` and `upgradedAt`
in `manifest.json`. A build that has no step for some version refuses to open
the directory and names the missing step; it changes nothing.

A step that only adds something old files can be read without, like version 2,
rewrites nothing, and the manifest is simply updated. A step that rewrites
files works like this:

1. The manifest is first rewritten with the new version and a `migratingFrom`
   field. Older servers now refuse the directory, so none of them can open
   files that are half rewritten.
2. The steps run. Each one is written to be safe to run again.
3. The manifest is rewritten without `migratingFrom`.

If the process stops between steps 1 and 3, `migratingFrom` is still in the
manifest. The next start runs the steps again from that version, which finishes
the upgrade. A newer build with more steps carries on from there too.

Make a backup with `sinterd backup` before the first start after an upgrade
that rewrites files. See [backup.md](./backup.md).

## Backups

Stop the server cleanly with `SIGTERM` or `SIGINT`, which writes a final
checkpoint, then use `sinterd backup` to make a checked copy and
`sinterd restore` to bring it back. See [backup.md](./backup.md). Do not copy a
directory while a server is writing to it.

## Inspecting and repairing

`sinterd inspect` reports the state of a data directory without changing it:
the manifest, the lock, every snapshot and every log segment, and whether the
server could open it. `sinterd repair` plans, and with `--apply` carries out,
the changes that make a damaged directory open again. It moves files to a
`quarantine` directory instead of deleting them, and steps that can discard log
records need `--allow-data-loss`. See [repair.md](./repair.md).

## When a disk write fails

What the client sees depends on why the write failed.

| Cause                                          | Client receives                                   | What happened to the write                                | Server state                                                            |
| ---------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| The disk or quota is full (`ENOSPC`, `EDQUOT`) | `InternalError`, storage code `DISK_FULL`         | Not applied. The log is cut back to its last whole record | Keeps running. Reads work, and writes succeed again once space is freed |
| The operating system refuses access            | `InternalError`, storage code `PERMISSION_DENIED` | Not applied                                               | The log refuses further writes until the server restarts                |
| Any other failure, or a failed flush to disk   | `InternalError`, "the outcome is unknown"         | May or may not have reached the disk                      | The log refuses further writes until the server restarts and recovers   |

A failed flush (`fsync`) is never treated as a full disk, even if the operating
system reports it that way. After one, the server cannot know which writes
reached stable storage, so it stops and recovers the true state from disk on
the next start.

Other files fail the same way. A checkpoint that cannot be written is reported
as `DISK_FULL` or `PERMISSION_DENIED`, leaves no partial snapshot behind, and is
tried again at the next trigger; the log is not truncated and no data is lost. A
log segment that cannot be created because the disk is full leaves the current
segment in use, so the write fails and a later one can succeed.

With the `memory` write concern, writes the server has already acknowledged can
wait in memory for up to about 100 ms. If the disk is full then, they stay
queued and are written when space returns. A write that is refused instead of
queued is not applied.

## Failure testing

The recovery and backup code is tested by breaking it on purpose:

- **Killing the process.** A child process writes and is stopped with `SIGKILL`
  at different moments, including in the middle of a checkpoint. Every write it
  acknowledged must still be there after the restart.
- **Failing every file system call in turn.** A fixed set of operations (inserts,
  updates, indexes, snapshots, pruning, log rotation) is run once per file
  system call it makes, and a different call fails each time with a disk error
  or a full disk. After each failure the directory must reopen, keep every
  operation that succeeded, hold either all or none of the one that failed, and
  have consistent indexes. A step that reports a full disk must leave no trace.
  The same is done for starting the engine, `backup` and `restore`; these must
  leave either a complete result or nothing, and no lock behind.
- **Cutting the log short at every byte.** Recovery must produce a state the
  database really had, never go backwards as more of the log survives, and never
  produce anything else.
- **Flipping every byte.** In the log, a flipped byte is either reported as
  damage or looks like an unfinished last write; in the newest snapshot it makes
  recovery fall back to the older one with nothing lost; in the manifest it is
  an error or harmless.

These tests model failed system calls and damaged files. They do not model a
power cut that loses data the operating system had accepted but not yet written
to disk, so they cannot show that a missing `fsync` loses data.

## Limits

- The dataset must fit in memory. Recovery briefly needs about twice the size
  of the snapshot it loads.
- Database and collection names can be at most 255 bytes.
- Recovery rebuilds every index, so startup time grows with the number and size
  of indexes.
- There is no encryption, compression, or replication.
- Reads and writes share one thread with checkpoints.
- The on-disk format has a version. A server refuses data written by a newer
  format and tells you to upgrade.
