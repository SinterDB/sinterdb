# Running SinterDB in Docker

The repository includes a [`Dockerfile`](../Dockerfile) for the server and a
[Compose example](../examples/docker/compose.yaml). Use them to run `sinterd`
without installing Node.js packages on your machine.

> SinterDB `0.3.0` is a developer preview, and there is no published image yet.
> You build the image yourself from a clone of this repository, as shown below.

> **Authentication and TLS are not implemented yet.** Anyone who can reach the
> port can read and change every database. Publish the port on `127.0.0.1`, as
> every command on this page does, and never on a public interface.

## Build the image

From the root of the repository:

```bash
docker build --tag sinterdb-local .
```

The build compiles the server in a first stage and copies one bundled file into
a small runtime image based on `node:24-slim`. The image contains no source
code, no `node_modules`, and no package manager.

## Run it

```bash
docker run --detach --name sinterdb \
  --publish 127.0.0.1:4721:4721 \
  --volume sinterdb-data:/data \
  sinterdb-local
```

Your programs on the host connect to `sinterdb://127.0.0.1:4721`, exactly as in
the [quick start](./quick-start.md).

The `--volume` option is what keeps your data. The server stores everything in
`/data`, and a named volume survives `docker rm`. Without a volume, the data
goes away with the container.

Stop the server with `docker stop sinterdb`. It handles `SIGTERM` like Ctrl+C
in the quick start: it closes connections and writes a final checkpoint. Start
it again with `docker start sinterdb` and the data is recovered from the volume.

```bash
docker stop sinterdb
docker start sinterdb
docker logs sinterdb
```

The logs are JSON lines, one per event, unless the container has a terminal
(`docker run -t`), in which case they are the readable form. Leave out `-t`
to keep them as JSON. After a
restart the `server.started` line reports `"storage":"disk"` and how many
records were replayed.

## Use Docker Compose

```bash
docker compose --file examples/docker/compose.yaml up --detach --build --wait
docker compose --file examples/docker/compose.yaml down
```

The example builds the image, publishes `127.0.0.1:4721`, mounts a named volume
at `/data`, restarts the server after a crash or a reboot, and waits for the
health check before `up` returns. `down` removes the container but keeps the
volume. Add `--volumes` to delete the data as well. Set `SINTERDB_PUBLISH_PORT`
to publish on another host port.

## What the image sets

| Setting        | Value     | Why                                                  |
| -------------- | --------- | ---------------------------------------------------- |
| Listening host | `0.0.0.0` | Published ports cannot reach a server on `127.0.0.1` |
| Port           | `4721`    | The default port                                     |
| Data directory | `/data`   | Declared as a volume                                 |
| Reclaim lock   | `true`    | A killed container leaves its lock in the volume     |
| User           | `node`    | The server does not run as root                      |

Each of these comes from an environment variable listed in the
[configuration reference](./configuration.md), so you can change them with
`--env`, for example `--env SINTERDB_WRITE_CONCERN=journaled`, or pass flags after
the image name, for example `sinterdb-local --write-concern journaled`. Flags win
over environment variables.

If you change the port, publish the new port as well. The image's health check
follows `SINTERDB_PORT`.

## Bind mounts and permissions

The server runs as the `node` user, which has user id `1000`. A named volume
is created with the right owner. A bind mount uses the host folder as it is, so
make it writable first:

```bash
mkdir -p ./sinterdb-data
sudo chown 1000:1000 ./sinterdb-data
docker run --detach --publish 127.0.0.1:4721:4721 \
  --volume "$PWD/sinterdb-data:/data" sinterdb-local
```

If the folder is not writable, the server exits at startup and the container
log says why.

Run only one server on a data directory. A second server on the same folder
fails to start because the directory is in use.

## Health check

The image checks every ten seconds that the server accepts TCP connections.
`docker ps` shows `healthy` once it does, and `docker compose up --wait` waits
for it. The check does not run a query, so it says the server is listening, not
that your data is correct.

## Stopping

`docker stop` sends `SIGTERM` and waits ten seconds before it kills the
container. A clean stop finishes much sooner: the server ends open connections,
destroys any that are still open after five seconds, and writes a final
checkpoint. If a container is killed anyway, the next start recovers from the
write-ahead log; see [storage.md](./storage.md).

A killed container also leaves the `LOCK` file in the volume. Every container
has its own host name, so the next container cannot tell that the owner is gone.
The image sets `SINTERDB_RECLAIM_LOCK=true`, which makes the server take such a
lock over. This is only safe while one container at a time uses a volume, so do
not mount the same volume or folder into two running containers. SinterDB does
not support that, and the setting removes the protection that would stop it.
