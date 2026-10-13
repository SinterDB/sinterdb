"use client";

import { useEffect, useState } from "react";

import type { ApiTocEntry } from "../_generated/model";

/** "On this page" list that highlights the section in view. */
export function Toc({ entries }: { readonly entries: readonly ApiTocEntry[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const ids = entries.flatMap((entry) => [
      entry.id,
      ...entry.items.map((item) => item.anchor),
    ]);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    const observer = new IntersectionObserver(
      (observed) => {
        const visible = observed.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) {
          setActive(visible[0]!.target.id);
        }
      },
      { rootMargin: "0px 0px -75% 0px" },
    );

    for (const element of elements) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [entries]);

  if (entries.length === 0) {
    return null;
  }

  return (
    <aside className="tdk-toc">
      <nav aria-label="On this page">
        <p className="tdk-toc-title">On this page</p>
        <ul>
          {entries.map((entry) => (
            <li key={entry.id}>
              <a
                href={`#${entry.id}`}
                aria-current={active === entry.id ? "location" : undefined}
              >
                {entry.title}
              </a>
              {entry.items.length > 0 && (
                <ul>
                  {entry.items.map((item) => (
                    <li key={item.anchor}>
                      <a
                        href={`#${item.anchor}`}
                        className={
                          item.deprecated ? "tdk-deprecated" : undefined
                        }
                        title={item.deprecated ? "Deprecated" : undefined}
                        aria-current={
                          active === item.anchor ? "location" : undefined
                        }
                      >
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
