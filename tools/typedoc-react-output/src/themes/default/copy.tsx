"use client";

import { useEffect } from "react";

/**
 * One listener for every copy button on the page. Buttons are plain markup
 * (`data-tdk-copy`), so code blocks inside rendered doc comments work too
 * and code blocks stay server components.
 */
export function CopyHandler() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
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
