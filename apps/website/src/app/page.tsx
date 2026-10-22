import PopupBanner from "@/components/popupBanner";

const features = [
  {
    title: "TypeScript-first",
    description:
      "Typed database and collection handles, filters, updates, sorting, and cursor APIs for Node.js.",
  },
  {
    title: "Document-oriented",
    description:
      "Store structured documents with deterministic binary encoding and custom identifiers.",
  },
  {
    title: "Typed CRUD APIs",
    description:
      "Insert, query, update, replace, and delete documents through a TypeScript-first Node.js API.",
  },
  {
    title: "Open source",
    description:
      "Built in public under the Apache 2.0 license with the protocol and roadmap in the open.",
  },
];

const currentFeatures = [
  "updateOne and updateMany",
  "replaceOne",
  "deleteOne and deleteMany",
  "$set, $unset, $inc, $min, and $max",
  "$push, $pull, and $addToSet",
  "Upserts and typed UpdateFilter APIs",
];

export default function Home() {
  return (
    <>
      <PopupBanner
        type="notice"
        label="SinterDB 0.3.0 developer preview docs are live."
        href="/docs"
        linkLabel="Read the docs"
        id="docs-launch"
      />

      <main className="min-h-screen overflow-hidden bg-[#090909] text-zinc-100">
        <div className="site-grid fixed inset-0 z-0" aria-hidden="true" />

        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-0 h-136
        bg-[radial-gradient(circle_at_50%_-10%,rgba(249,115,22,0.16),transparent_58%)]"
        />

        <header className="relative z-10 border-b border-white/[0.07] bg-black/20 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
            <a
              href="#top"
              className="group flex items-center gap-3"
              aria-label="SinterDB home"
            >
              <span
                className="flex size-8 items-center justify-center rounded-lg
              border border-orange-500/25 bg-orange-500/10 font-mono
              text-sm font-bold text-orange-400 transition
              group-hover:border-orange-400/40 group-hover:bg-orange-500/15"
              >
                S
              </span>

              <span className="text-[15px] font-semibold tracking-tight">
                SinterDB
              </span>
            </a>

            <nav className="hidden items-center gap-7 text-sm text-zinc-400 sm:flex">
              <a className="transition hover:text-white" href="#features">
                Features
              </a>

              <a className="transition hover:text-white" href="#status">
                Status
              </a>

              <a
                className="transition hover:text-white"
                href="https://github.com/SinterDB/sinterdb/blob/main/ROADMAP.md"
                target="_blank"
                rel="noreferrer"
              >
                Roadmap
              </a>

              <a
                className="transition hover:text-white"
                href="https://github.com/SinterDB/sinterdb"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </nav>

            <span className="rounded-full border border-white/10 bg-white/4 px-3 py-1 font-mono text-[11px] text-zinc-400">
              v0.0.7
            </span>
          </div>
        </header>

        <section id="top" className="relative z-10">
          <div
            className="mx-auto grid max-w-7xl gap-16 px-5 pb-24 pt-20
          sm:px-8 sm:pt-28
          lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-10 lg:pb-32 lg:pt-32"
          >
            <div>
              <div
                className="mb-7 inline-flex items-center gap-2 rounded-full
              border border-orange-500/20 bg-orange-500/[0.07]
              px-3 py-1.5 font-mono text-xs text-orange-300"
              >
                <span className="size-1.5 rounded-full bg-orange-400 shadow-[0_0_14px_rgba(251,146,60,0.9)]" />
                v0.0.7 · Updates, Replacements &amp; Deletes
              </div>

              <h1
                className="max-w-3xl text-balance text-5xl font-semibold
              leading-[0.98] tracking-[-0.045em] text-white
              sm:text-6xl lg:text-7xl"
              >
                A document database built for{" "}
                <span className="text-orange-400">TypeScript.</span>
              </h1>

              <p className="mt-7 max-w-2xl text-pretty text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8">
                SinterDB is an open-source document-oriented database with a
                TypeScript-first Node.js driver, a versioned wire protocol, and
                a database server being built from the ground up.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#get-started"
                  className="inline-flex h-11 items-center justify-center rounded-lg
                bg-orange-500 px-5 text-sm font-semibold text-black
                transition hover:bg-orange-400"
                >
                  Get started
                </a>

                <a
                  href="https://github.com/SinterDB/sinterdb"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2
                rounded-lg border border-white/10 bg-white/4
                px-5 text-sm font-medium text-zinc-200 transition
                hover:border-white/20 hover:bg-white/[0.07]"
                >
                  View on GitHub
                </a>
              </div>

              <p className="mt-5 text-xs leading-5 text-zinc-600">
                Early development · APIs and protocol details may change before
                1.0.
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:mx-0 lg:max-w-none">
              <div className="absolute -inset-16 -z-10 bg-[radial-gradient(circle,rgba(249,115,22,0.11),transparent_62%)] blur-2xl" />

              <div className="overflow-hidden rounded-2xl border border-white/9 bg-[#0d0d0d] shadow-2xl shadow-black/40">
                <div className="flex h-11 items-center gap-2 border-b border-white/[0.07] px-4">
                  <span className="size-2.5 rounded-full bg-zinc-700" />
                  <span className="size-2.5 rounded-full bg-zinc-700" />
                  <span className="size-2.5 rounded-full bg-zinc-700" />

                  <span className="ml-2 font-mono text-[11px] text-zinc-600">
                    example.ts
                  </span>
                </div>

                <pre className="overflow-x-auto p-5 font-mono text-[12px] leading-6 text-zinc-300 sm:p-7 sm:text-[13px]">
                  <code>{`interface User {
  name: string;
  age: number;
  active: boolean;
}

const db = client.db("app");
const users = db.collection<User>("users");

await users.updateOne(
  { name: "Kage" },
  {
    $set: { active: true },
    $inc: { age: 1 },
  },
);

const result = await users.deleteMany({
  active: false,
});

console.log(result.deletedCount);`}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="relative z-10 border-y border-white/[0.07] bg-white/1.5"
        >
          <div
            className="mx-auto grid max-w-7xl divide-y divide-white/[0.07]
          px-5 sm:grid-cols-2 sm:divide-x sm:divide-y-0 sm:px-8
          lg:grid-cols-4 lg:px-10"
          >
            {features.map((feature) => (
              <article
                key={feature.title}
                className="px-0 py-8 sm:px-7 lg:px-6"
              >
                <div
                  className="mb-4 flex size-8 items-center justify-center
                rounded-md border border-orange-500/15
                bg-orange-500/6 font-mono text-xs text-orange-400"
                >
                  +
                </div>

                <h2 className="text-sm font-semibold text-zinc-100">
                  {feature.title}
                </h2>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="status" className="relative z-10">
          <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-orange-400">
                  Development status
                </p>

                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Building the foundation first.
                </h2>

                <p className="mt-5 max-w-md text-sm leading-7 text-zinc-500 sm:text-base">
                  SinterDB is still early. Version 0.0.7 expands the document
                  API with updates, replacements, deletes, upserts, and typed
                  update operators.
                </p>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/2.5 p-5 sm:p-7">
                <div className="flex flex-col gap-3 border-b border-white/[0.07] pb-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-mono text-xs text-zinc-500">
                      CURRENT MILESTONE
                    </p>

                    <h3 className="mt-2 text-xl font-semibold text-white">
                      0.0.7 · Updates, Replacements &amp; Deletes
                    </h3>
                  </div>

                  <span className="w-fit rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-1 font-mono text-[11px] text-emerald-300">
                    in development
                  </span>
                </div>

                <div className="grid gap-x-8 gap-y-3 py-6 sm:grid-cols-2">
                  {currentFeatures.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-3 text-sm text-zinc-400"
                    >
                      <span className="font-mono text-orange-400">✓</span>
                      {feature}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3 rounded-xl border border-white/6 bg-black/25 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                      Up next
                    </p>

                    <p className="mt-1 text-sm font-medium text-zinc-300">
                      v0.0.8 · Durable storage &amp; recovery
                    </p>
                  </div>

                  <a
                    href="https://github.com/SinterDB/sinterdb/blob/main/ROADMAP.md#008--durable-storage-and-recovery"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-orange-400 transition hover:text-orange-300"
                  >
                    View roadmap →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="get-started"
          className="relative z-10 border-t border-white/[0.07]"
        >
          <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10">
            <div
              className="grid items-center gap-10 rounded-2xl border
            border-white/8
            bg-[linear-gradient(135deg,rgba(249,115,22,0.08),rgba(255,255,255,0.015)_45%)]
            p-6 sm:p-9 lg:grid-cols-[1fr_auto] lg:p-10"
            >
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-orange-400">
                  Get started
                </p>

                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Explore SinterDB while it takes shape.
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-500">
                  The project is not production-ready yet, but the server,
                  protocol, driver, tests, and development roadmap are all
                  available on GitHub.
                </p>
              </div>

              <a
                href="https://github.com/SinterDB/sinterdb"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-lg
              bg-white px-5 text-sm font-semibold text-black transition
              hover:bg-zinc-200"
              >
                Browse the repository →
              </a>
            </div>
          </div>
        </section>

        <footer className="relative z-10 border-t border-white/[0.07]">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
            <p>© 2026 SinterDB · Apache License 2.0</p>

            <div className="flex gap-5">
              <a
                className="transition hover:text-zinc-300"
                href="https://github.com/SinterDB/sinterdb"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>

              <a
                className="transition hover:text-zinc-300"
                href="https://github.com/SinterDB/sinterdb/blob/main/ROADMAP.md"
                target="_blank"
                rel="noreferrer"
              >
                Roadmap
              </a>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
