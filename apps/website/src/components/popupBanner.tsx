"use client";

import {
  Banner,
  BannerClose,
  BannerContent,
  BannerDescription,
} from "@/components/cl/banner";
import { cn } from "@/lib/cl-utils";

export type BannerType = "notice" | "important" | "warning" | "error";

const STYLES: Record<BannerType, { box: string; dot: string }> = {
  notice: {
    box: "border-cyan-500/25 bg-cyan-950/80 text-cyan-100",
    dot: "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]",
  },
  important: {
    box: "border-violet-500/25 bg-violet-950/80 text-violet-100",
    dot: "bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.8)]",
  },
  warning: {
    box: "border-amber-500/25 bg-amber-950/80 text-amber-100",
    dot: "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]",
  },
  error: {
    box: "border-red-500/25 bg-red-950/80 text-red-100",
    dot: "bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.8)]",
  },
};

export default function PopupBanner({
  label,
  type = "notice",
  id,
  href,
  linkLabel = "Learn more",
  className = "",
}: {
  label: string;
  type?: BannerType;
  /** When set, closing the banner is remembered in this browser. */
  id?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}) {
  const style = STYLES[type];

  return (
    <Banner
      role={type === "error" ? "alert" : "status"}
      storageKey={id ? `banner-dismissed:${id}` : undefined}
      className={cn(
        "fixed inset-x-4 bottom-4 z-50 mx-auto w-auto max-w-xl rounded-xl border py-3 shadow-2xl shadow-black/50 backdrop-blur-xl duration-300 starting:translate-y-3 starting:opacity-0",
        style.box,
        className,
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", style.dot)} />

      <BannerContent className="items-center sm:justify-start">
        <BannerDescription className="leading-6 opacity-100">
          {label}
          {href && (
            <>
              {" "}
              <a
                href={href}
                className="opacity-90 transition hover:opacity-100"
              >
                {linkLabel} →
              </a>
            </>
          )}
        </BannerDescription>
      </BannerContent>

      <BannerClose />
    </Banner>
  );
}
