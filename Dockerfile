# syntax=docker/dockerfile:1

# The SinterDB server (`sinterd`) as a container image.
#
# Build it from the root of the repository:
#
#   docker build --tag sinterdb-local .
#
# The server keeps its data in /data. Mount a volume there, or the data is lost
# when the container is removed. See docs/docker.md.

ARG NODE_VERSION=24
# Keep in step with "packageManager" in package.json; a test checks this.
ARG PNPM_VERSION=12.14.0

FROM node:${NODE_VERSION}-slim AS build

ARG PNPM_VERSION
RUN npm install --global "pnpm@${PNPM_VERSION}"

WORKDIR /repo
COPY . .

# Build only the CLI and the packages it depends on. esbuild bundles them into
# a single file, so the runtime image needs no node_modules.
RUN pnpm install --frozen-lockfile --filter "@sinterdb/cli..." \
 && pnpm --filter "@sinterdb/cli..." build

FROM node:${NODE_VERSION}-slim AS runtime

LABEL org.opencontainers.image.title="SinterDB server" \
      org.opencontainers.image.description="The sinterd server for the SinterDB document database." \
      org.opencontainers.image.source="https://github.com/SinterDB/sinterdb" \
      org.opencontainers.image.licenses="Apache-2.0"

# Inside a container the server has to listen on every interface, or published
# ports cannot reach it. Publish the port on 127.0.0.1 only: SinterDB has no
# authentication or TLS yet.
#
# Every container has its own host name, so the lock a killed container leaves
# in the volume always looks like it belongs to another machine. The volume is
# meant for one container at a time, so the server takes such a lock over.
ENV NODE_ENV=production \
    SINTERDB_HOST=0.0.0.0 \
    SINTERDB_PORT=4721 \
    SINTERDB_DATA_DIR=/data \
    SINTERDB_RECLAIM_LOCK=true

WORKDIR /app
COPY --from=build /repo/apps/server-cli/dist/ ./
RUN echo '{"type":"module"}' > package.json \
 && mkdir /data \
 && chown node:node /data

USER node
VOLUME /data
EXPOSE 4721

# A plain TCP connect is enough to know the server is accepting connections.
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "-e", "require('node:net').connect(Number(process.env.SINTERDB_PORT)||4721,'127.0.0.1').on('connect',function(){this.end();process.exit(0)}).on('error',function(){process.exit(1)})"]

ENTRYPOINT ["node", "/app/index.js"]
