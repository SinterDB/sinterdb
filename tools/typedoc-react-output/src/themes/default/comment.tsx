import type { ApiComment } from "../_generated/model";
import { cx } from "./utils";

/** HTML rendered from doc comments at build time. */
export function Html({
  html,
  className,
}: {
  readonly html: string;
  readonly className?: string;
}) {
  if (!html) {
    return null;
  }

  return (
    <div
      className={cx("tdk-prose", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function Deprecated({
  comment,
}: {
  readonly comment: ApiComment | null;
}) {
  if (comment?.deprecated === null || comment?.deprecated === undefined) {
    return null;
  }

  return (
    <div className="tdk-callout" data-tone="warning" role="note">
      <p className="tdk-callout-title">Deprecated</p>
      <Html html={comment.deprecated} />
    </div>
  );
}

/**
 * Summary and block tags (`@remarks`, `@example`, ...). The deprecation
 * notice is rendered separately so it can sit above the declaration.
 */
export function Comment({
  comment,
  summary = true,
}: {
  readonly comment: ApiComment | null;
  readonly summary?: boolean;
}) {
  if (!comment) {
    return null;
  }

  return (
    <>
      {summary && <Html html={comment.summary} />}

      {comment.blocks.map((block, index) => (
        <section key={index} className="tdk-block" data-tag={block.tag}>
          <h4 className="tdk-label">{block.title}</h4>
          <Html html={block.html} />
        </section>
      ))}
    </>
  );
}

/** "v0.2.0" chip from `@since`. */
export function Since({ version }: { readonly version: string | null }) {
  return version ? (
    <span className="tdk-since" title={`Added in ${version}`}>
      v{version}
    </span>
  ) : null;
}

export function Badges({ badges }: { readonly badges: readonly string[] }) {
  if (badges.length === 0) {
    return null;
  }

  return (
    <span className="tdk-badges">
      {badges.map((badge) => (
        <span key={badge} className="tdk-badge" data-badge={badge}>
          {badge}
        </span>
      ))}
    </span>
  );
}
