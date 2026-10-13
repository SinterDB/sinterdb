import Link from "next/link";
import type { ReactNode } from "react";

import { resolveApiLink } from "@/lib/api-links";

/**
 * Link to a generated API page.
 *
 * <Api name="SinterClient" />
 * <Api name="SinterCollection.findOne" />
 * <Api name="SinterDatabase.collection">collection()</Api>
 *
 * In plain markdown the same thing is `[findOne](api:SinterCollection.findOne)`.
 */
export function Api({
  name,
  children,
}: {
  readonly name: string;
  readonly children?: ReactNode;
}) {
  const { href, deprecated } = resolveApiLink(name);

  return (
    <Link
      href={href}
      className={
        deprecated ? "docs-api-link docs-api-deprecated" : "docs-api-link"
      }
      title={deprecated ?? undefined}
    >
      <code>{children ?? name}</code>
    </Link>
  );
}

export function Callout({
  title,
  tone = "accent",
  children,
}: {
  readonly title?: string;
  readonly tone?: "accent" | "neutral" | "warning";
  readonly children: ReactNode;
}) {
  const tones = {
    accent:
      "border-orange-500/15 bg-orange-500/4 [&_.callout-title]:text-orange-300",
    neutral: "border-white/8 bg-white/2 [&_.callout-title]:text-white",
    warning:
      "border-amber-500/20 bg-amber-500/5 [&_.callout-title]:text-amber-300",
  };

  return (
    <aside className={`docs-callout my-6 rounded-xl border p-5 ${tones[tone]}`}>
      {title && (
        <p className="callout-title mb-2 text-sm font-semibold">{title}</p>
      )}
      <div className="text-sm leading-6 text-zinc-400">{children}</div>
    </aside>
  );
}

export function Cards({ children }: { readonly children: ReactNode }) {
  return <div className="my-8 grid gap-4 sm:grid-cols-2">{children}</div>;
}

export function Card({
  title,
  href,
  cta = "Read more →",
  children,
}: {
  readonly title: string;
  readonly href: string;
  readonly cta?: string;
  readonly children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-white/8 bg-white/2 p-6 transition hover:border-orange-500/25 hover:bg-orange-500/3"
    >
      <span className="block text-base font-semibold text-white transition group-hover:text-orange-300">
        {title}
      </span>
      <span className="mt-2 block text-sm leading-6 text-zinc-500">
        {children}
      </span>
      <span className="mt-auto pt-5 text-sm text-orange-400">{cta}</span>
    </Link>
  );
}
