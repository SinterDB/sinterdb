"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function DocsHeaderTabs() {
  const inApi = usePathname().startsWith("/docs/api");

  const tab =
    "relative flex h-16 items-center transition hover:text-white aria-[current=true]:text-white aria-[current=true]:after:absolute aria-[current=true]:after:inset-x-0 aria-[current=true]:after:-bottom-px aria-[current=true]:after:h-px aria-[current=true]:after:bg-orange-400";

  return (
    <nav className="flex shrink-0 items-center gap-4 text-sm text-zinc-400 sm:gap-5">
      <Link href="/docs" className={tab} aria-current={!inApi}>
        Guides
      </Link>
      <Link href="/docs/api" className={tab} aria-current={inApi}>
        <span className="sm:hidden">API</span>
        <span className="hidden sm:inline">API Reference</span>
      </Link>
      <a
        href="https://github.com/SinterDB/sinterdb"
        target="_blank"
        rel="noreferrer"
        className="transition hover:text-white"
      >
        GitHub
      </a>
    </nav>
  );
}
