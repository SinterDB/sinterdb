"use client";

import { useEffect } from "react";

/**
 * One listener for every copy button on the page. Buttons are plain markup
 * (`data-tdk-copy`), so code blocks inside rendered doc comments work too
 * and code blocks stay server components. Clicking a `#` anchor also copies
 * the link to that section or member.
 */
export function CopyHandler() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const anchor = (
        event.target as Element | null
      )?.closest<HTMLAnchorElement>("a.tdk-anchor");

      if (anchor) {
        // The browser still follows the link, so the address bar updates too.
        void navigator.clipboard.writeText(anchor.href).then(() => {
          anchor.dataset.copied = "";
          setTimeout(() => {
            delete anchor.dataset.copied;
          }, 1500);
        });
        return;
      }

      const button = (event.target as Element | null)?.closest<HTMLElement>(
        "[data-tdk-copy]",
      );
      const pre = button?.closest(".tdk-code-block")?.querySelector("pre");

      if (!button || !pre) {
        return;
      }

      void navigator.clipboard.writeText(pre.innerText).then(() => {
        button.textContent = "Copied";
        setTimeout(() => {
          button.textContent = "Copy";
        }, 1500);
      });
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}

export function CopyButton() {
  return (
    <button
      type="button"
      className="tdk-copy"
      data-tdk-copy=""
      aria-label="Copy code"
    >
      Copy
    </button>
  );
}
