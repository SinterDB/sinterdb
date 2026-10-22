import Link from "next/link";
import type { ReactNode } from "react";

import { Search } from "@/app/docs/api/_components/search";
import { DocsHeaderTabs } from "@/components/docs/header-tabs";
import { getGuideSearchEntries } from "@/lib/guide-search";

// The search box uses the API theme's styles on guide pages too.
import "./api/_components/api.css";

/**
 * Shared header for guides and the API reference. Each section brings its own
 * sidebar: `(guides)/layout.tsx` for the hand-written pages and
 * `api/_components` for the generated reference. The header is 4rem tall,
 * which the API theme expects (`--tdk-top`).
 *
 * The search box covers both: the API index from the generator, plus the
 * guide pages and their headings.
 */
export default async function DocsLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  const guides = await getGuideSearchEntries();

  return (
    <div className="min-h-screen bg-[#090909] text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#090909]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-368 items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg border border-orange-500/25 bg-orange-500/10 font-mono text-sm font-bold text-orange-400">
              S
            </span>

            <span className="flex items-center gap-2">
              <span className="hidden text-sm font-semibold sm:inline">
                SinterDB
              </span>
              <span className="hidden text-sm text-zinc-600 sm:inline">/</span>
              <span className="hidden text-sm text-zinc-400 sm:inline">
                Docs
              </span>
            </span>
          </Link>

          <div
            className="tdk-root w-full max-w-64 min-w-0 [&_.tdk-search-button]:mb-0"
            data-scheme="dark"
          >
            <Search label="the docs" extraEntries={guides} />
          </div>

          <DocsHeaderTabs />
        </div>
      </header>

      {children}
    </div>
  );
}
