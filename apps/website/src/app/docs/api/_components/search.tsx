"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import type { ApiSearchEntry } from "../_generated/model";
import { KindIcon } from "./kind-icon";
import { cx } from "./utils";

let index: Promise<readonly ApiSearchEntry[]> | null = null;

/** Search data is a separate chunk, loaded the first time it's needed. */
export function loadSearchIndex() {
  index ??= import("../_generated/search").then((module) => module.searchIndex);
  return index;
}

const LIMIT = 40;

/**
 * Lower is better, `null` is no match. Every word in the query has to
 * appear in the qualified name or summary; the first word decides the rank.
 */
function rank(entry: ApiSearchEntry, words: readonly string[]) {
  const name = entry.name.toLowerCase();
  const full = (
    entry.parent ? `${entry.parent}.${entry.name}` : entry.name
  ).toLowerCase();
  const summary = entry.summary.toLowerCase();

  if (!words.every((word) => full.includes(word) || summary.includes(word))) {
    return null;
  }

  const [first = ""] = words;
  const score =
    name === first || full === first
      ? 0
      : name.startsWith(first)
        ? 1
        : full.startsWith(first)
          ? 2
          : name.includes(first)
            ? 3
            : full.includes(first)
              ? 4
              : 6;

  // Pages before members, deprecated last.
  return score * 4 + (entry.parent ? 1 : 0) + (entry.deprecated ? 2 : 0);
}

function search(entries: readonly ApiSearchEntry[], query: string) {
  const words = query.toLowerCase().split(/\s+/u).filter(Boolean);

  if (words.length === 0) {
    return [];
  }

  return entries
    .map((entry) => ({ entry, score: rank(entry, words) }))
    .filter(
      (result): result is { entry: ApiSearchEntry; score: number } =>
        result.score !== null,
    )
    .toSorted(
      (a, b) =>
        a.score - b.score ||
        a.entry.name.length - b.entry.name.length ||
        a.entry.name.localeCompare(b.entry.name),
    )
    .slice(0, LIMIT)
    .map((result) => result.entry);
}

/**
 * Search box: opens a palette with ⌘K, Ctrl+K or `/`. It searches the API
 * index plus any `extraEntries`, such as a site's guide pages. Entries of
 * kind `guide` and `section` show as "Page › Section".
 *
 * Render one per page: each instance listens for the shortcut.
 */
export function Search({
  label,
  extraEntries = [],
}: {
  readonly label: string;
  readonly extraEntries?: readonly ApiSearchEntry[];
}) {
  const router = useRouter();
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [entries, setEntries] = useState<readonly ApiSearchEntry[] | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const results = entries ? search(entries, query) : [];

  function open() {
    void loadSearchIndex().then((api) => setEntries([...extraEntries, ...api]));
    dialogRef.current?.showModal();
    inputRef.current?.select();
  }

  function close() {
    dialogRef.current?.close();
  }

  function go(entry: ApiSearchEntry) {
    close();
    router.push(entry.href);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (dialogRef.current?.open) {
        return;
      }

      // Focus can stay on the palette's input after it closes; that's not typing.
      const target = event.target as HTMLElement | null;
      const typing =
        !target?.closest(".tdk-search") &&
        (target?.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? ""));

      if (
        (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) ||
        (event.key === "/" && !typing)
      ) {
        event.preventDefault();
        open();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <>
      <button type="button" className="tdk-search-button" onClick={open}>
        <span>Search {label}…</span>
        <kbd>⌘K</kbd>
      </button>

      <dialog
        ref={dialogRef}
        className="tdk-search"
        aria-label={`Search ${label}`}
        onClick={(event) => {
          // A click on the backdrop lands on the dialog itself.
          if (event.target === dialogRef.current) {
            close();
          }
        }}
      >
        <div className="tdk-search-panel">
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            spellCheck={false}
            className="tdk-search-input"
            placeholder={`Search ${label}`}
            aria-label={`Search ${label}`}
            aria-controls={`${id}-results`}
            aria-activedescendant={
              results[active] ? `${id}-${active}` : undefined
            }
            role="combobox"
            aria-expanded={results.length > 0}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                // Handled here: some browsers spend the first Escape elsewhere.
                event.preventDefault();
                close();
              } else if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((value) => Math.min(value + 1, results.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((value) => Math.max(value - 1, 0));
              } else if (event.key === "Enter" && results[active]) {
                event.preventDefault();
                go(results[active]);
              }
            }}
          />

          {query.trim() === "" ? (
            <p className="tdk-search-hint">
              {entries
                ? `Search ${entries.length} pages and members by name or description.`
                : "Loading…"}
            </p>
          ) : results.length === 0 ? (
            <p className="tdk-search-hint">No results for “{query}”.</p>
          ) : (
            <ul
              ref={listRef}
              id={`${id}-results`}
              role="listbox"
              className="tdk-search-results"
            >
              {results.map((entry, index) => (
                <li
                  key={entry.href}
                  id={`${id}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  onMouseMove={() => setActive(index)}
                >
                  <Link
                    href={entry.href}
                    onClick={(event) => {
                      event.preventDefault();
                      go(entry);
                    }}
                  >
                    <KindIcon kind={entry.kind} />
                    <span className="tdk-search-text">
                      <span
                        className={cx(
                          "tdk-search-name",
                          entry.deprecated && "tdk-deprecated",
                        )}
                      >
                        {entry.parent && (
                          <span className="tdk-search-parent">
                            {entry.parent}
                            {entry.kind === "section" ? " › " : "."}
                          </span>
                        )}
                        {entry.name}
                      </span>
                      {entry.summary && (
                        <span className="tdk-search-summary">
                          {entry.summary}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <p className="tdk-search-keys" aria-hidden>
            <kbd>↑</kbd>
            <kbd>↓</kbd> to move · <kbd>Enter</kbd> to open · <kbd>Esc</kbd> to
            close
          </p>
        </div>
      </dialog>
    </>
  );
}
