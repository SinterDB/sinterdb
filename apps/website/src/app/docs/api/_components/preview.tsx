"use client";

import { useEffect, useState } from "react";

import type { ApiSearchEntry } from "../_generated/model";
import { KindIcon } from "./kind-icon";
import { loadSearchIndex } from "./search";
import { cx } from "./utils";

const DELAY = 300;

interface Shown {
  readonly entry: ApiSearchEntry;
  readonly top: number;
  readonly left: number;
}

/**
 * Hovering a type link in a signature or doc comment shows the target's
 * declaration and summary. One listener for the whole page; mouse only,
 * since touch screens open the link instead.
 */
export function HoverPreview() {
  const [shown, setShown] = useState<Shown | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let current: HTMLAnchorElement | null = null;

    function hide() {
      clearTimeout(timer);
      current = null;
      setShown(null);
    }

    function onOver(event: PointerEvent) {
      if (event.pointerType !== "mouse") {
        return;
      }

      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>(
        ".tdk-main :is(a.tdk-t-link, .tdk-prose a)[href^='/']",
      );

      if (link === current) {
        return;
      }

      hide();

      if (!link) {
        return;
      }

      current = link;
      timer = setTimeout(async () => {
        const entries = await loadSearchIndex();
        const href = link.getAttribute("href") ?? "";
        const entry =
          entries.find((item) => item.href === href) ??
          entries.find((item) => item.href === href.split("#")[0]);

        if (!entry || current !== link) {
          return;
        }

        const rect = link.getBoundingClientRect();
        setShown({
          entry,
          top: rect.bottom + 8,
          left: Math.max(
            8,
            Math.min(
              rect.left,
              window.innerWidth - Math.min(460, window.innerWidth - 16) - 8,
            ),
          ),
        });
      }, DELAY);
    }

    document.addEventListener("pointerover", onOver);
    window.addEventListener("scroll", hide, { passive: true });
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerover", onOver);
      window.removeEventListener("scroll", hide);
    };
  }, []);

  if (!shown) {
    return null;
  }

  const { entry } = shown;

  return (
    <div
      className="tdk-preview"
      role="tooltip"
      style={{ top: shown.top, left: shown.left }}
    >
      <p className="tdk-preview-title">
        <KindIcon kind={entry.kind} />
        <span className={cx(entry.deprecated && "tdk-deprecated")}>
          {entry.parent ? `${entry.parent}.${entry.name}` : entry.name}
        </span>
        {entry.deprecated && (
          <span className="tdk-badge" data-badge="deprecated">
            deprecated
          </span>
        )}
        {entry.since && <span className="tdk-since">v{entry.since}</span>}
      </p>
      {entry.code && <code className="tdk-preview-code">{entry.code}</code>}
      {entry.summary && <p className="tdk-preview-summary">{entry.summary}</p>}
    </div>
  );
}
