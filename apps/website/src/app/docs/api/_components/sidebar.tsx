"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { ApiProject } from "../_generated/model";
import { KindIcon } from "./kind-icon";

export function Sidebar({
  project,
  activeHref,
}: {
  readonly project: ApiProject;
  readonly activeHref: string | null;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);

  // Center the current page in the sidebar without scrolling the window.
  useEffect(() => {
    const aside = asideRef.current;
    const active = activeRef.current;

    if (aside && active && aside.scrollHeight > aside.clientHeight) {
      const offset =
        active.getBoundingClientRect().top - aside.getBoundingClientRect().top;
      aside.scrollTop += offset - aside.clientHeight / 2;
    }
  }, [activeHref]);

  const needle = query.trim().toLowerCase();
  const groups = project.navigation
    .map((group) => ({
      ...group,
      items: needle
        ? group.items.filter((item) => item.name.toLowerCase().includes(needle))
        : group.items,
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside ref={asideRef} className="tdk-sidebar" data-open={open}>
      <button
        type="button"
        className="tdk-sidebar-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{project.name}</span>
        <span aria-hidden>{open ? "−" : "+"}</span>
      </button>

      <div className="tdk-sidebar-panel">
        <Link
          href={project.href}
          className="tdk-sidebar-home"
          aria-current={activeHref === project.href ? "page" : undefined}
        >
          {project.name}
        </Link>

        <input
          type="search"
          className="tdk-filter"
          placeholder="Filter…"
          aria-label="Filter API"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <nav aria-label="API reference" onClick={() => setOpen(false)}>
          {groups.map((group) => (
            <section key={group.id} className="tdk-nav-group">
              <h2 className="tdk-nav-title">{group.title}</h2>
              <ul>
                {group.items.map((item) => {
                  const active = item.href === activeHref;

                  return (
                    <li key={item.id}>
                      <Link
                        ref={active ? activeRef : undefined}
                        href={item.href}
                        className="tdk-nav-link"
                        data-deprecated={item.deprecated || undefined}
                        title={item.deprecated ? "Deprecated" : undefined}
                        aria-current={active ? "page" : undefined}
                      >
                        <KindIcon kind={item.kind} />
                        <span
                          className={
                            item.deprecated ? "tdk-deprecated" : undefined
                          }
                        >
                          {item.name}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {groups.length === 0 && <p className="tdk-empty">No matches</p>}

          {project.hierarchyHref && !needle && (
            <Link
              href={project.hierarchyHref}
              className="tdk-nav-link tdk-nav-extra"
              aria-current={
                activeHref === project.hierarchyHref ? "page" : undefined
              }
            >
              Class hierarchy
            </Link>
          )}
        </nav>
      </div>
    </aside>
  );
}
