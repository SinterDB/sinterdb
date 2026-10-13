import Link from "next/link";

import type { ApiCode, ApiToken } from "../_generated/model";
import { CopyButton } from "./copy";
import { deprecationOf, deprecationTitle } from "./deprecation";
import { cx } from "./utils";

/**
 * Pre-highlighted code produced by the generator. Type references link
 * to their pages; nothing is parsed at runtime.
 */
export function Code({
  code,
  block = false,
  className,
}: {
  readonly code: ApiCode;
  readonly block?: boolean;
  readonly className?: string;
}) {
  const tokens = code.map((token, index) => (
    <Token key={index} token={token} />
  ));

  if (block) {
    return (
      <div className="tdk-code-block">
        <pre className={cx("tdk-code", className)}>
          <code>{tokens}</code>
        </pre>
        <CopyButton />
      </div>
    );
  }

  return <code className={cx("tdk-code-inline", className)}>{tokens}</code>;
}

function Token({ token }: { readonly token: ApiToken }) {
  const [text, kind, href] = token;
  const deprecation = deprecationOf(href);
  const className = cx(
    kind && `tdk-t-${kind}`,
    deprecation && "tdk-deprecated",
  );
  const title = deprecation ? deprecationTitle(deprecation) : undefined;

  if (href) {
    return /^https?:/u.test(href) ? (
      <a
        href={href}
        className={cx("tdk-t-link", className)}
        title={title}
        target="_blank"
        rel="noreferrer"
      >
        {text}
      </a>
    ) : (
      <Link
        href={href}
        prefetch={false}
        className={cx("tdk-t-link", className)}
        title={title}
      >
        {text}
      </Link>
    );
  }

  return className ? <span className={className}>{text}</span> : text;
}
