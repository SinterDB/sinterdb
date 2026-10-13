/**
 * Doc comments are rendered to HTML at build time. Links written with
 * `{@link ...}` are resolved to generated routes, and fenced code blocks
 * are syntax highlighted.
 *
 * @typedef {object} CommentBlockModel
 * @property {string} tag Block tag without the `@`.
 * @property {string} title
 * @property {string} html
 *
 * @typedef {object} CommentModel
 * @property {string} summary HTML.
 * @property {string} short Inline HTML of the first summary paragraph.
 * @property {string} plain Plain text of the first summary paragraph.
 * @property {string | null} deprecated HTML, `""` when deprecated without a reason.
 * @property {string | null} returns HTML of `@returns`.
 * @property {string[]} modifiers Modifier tags without the `@`, such as `beta`.
 * @property {CommentBlockModel[]} blocks
 */

const BLOCK_TITLES = {
  "@remarks": "Remarks",
  "@example": "Example",
  "@throws": "Throws",
  "@see": "See also",
  "@defaultValue": "Default value",
  "@default": "Default value",
  "@since": "Since",
};

/** Blocks shown somewhere other than the generic block list. */
const HANDLED_ELSEWHERE = new Set([
  "@returns",
  "@deprecated",
  "@param",
  "@typeParam",
  "@template",
]);

/** Order of blocks after the summary; unknown tags follow in source order. */
const BLOCK_ORDER = [
  "@remarks",
  "@defaultValue",
  "@default",
  "@throws",
  "@example",
  "@see",
  "@since",
];

const SHOWN_MODIFIERS = new Set([
  "@alpha",
  "@beta",
  "@experimental",
  "@sealed",
  "@eventProperty",
]);

/**
 * @param {import("typedoc").Comment | undefined} comment
 * @param {import("./context.js").ModelContext} ctx
 * @returns {CommentModel | null}
 */
export function createCommentModel(comment, ctx) {
  if (!comment || !ctx.options.features.comments) {
    return null;
  }

  const summaryMarkdown = partsToMarkdown(comment.summary, ctx);
  const firstParagraph = summaryMarkdown.split(/\n\s*\n/u)[0] ?? "";
  const deprecated = comment.getTag("@deprecated");
  const returns = comment.getTag("@returns");

  const blocks = comment.blockTags
    .filter((block) => !HANDLED_ELSEWHERE.has(block.tag))
    .toSorted((a, b) => blockRank(a.tag) - blockRank(b.tag))
    .map((block) => ({
      tag: block.tag.slice(1),
      title: BLOCK_TITLES[block.tag] ?? titleCase(block.tag.slice(1)),
      html: ctx.markdown.render(blockMarkdown(block, ctx)),
    }));

  const model = {
    summary: ctx.markdown.render(summaryMarkdown),
    short: ctx.markdown.renderInline(firstParagraph.replaceAll("\n", " ")),
    plain: toPlainText(comment.summary),
    deprecated: deprecated
      ? ctx.markdown.render(partsToMarkdown(deprecated.content, ctx))
      : null,
    returns: returns
      ? ctx.markdown.render(partsToMarkdown(returns.content, ctx))
      : null,
    modifiers: [...comment.modifierTags]
      .filter((tag) => SHOWN_MODIFIERS.has(tag))
      .map((tag) => tag.slice(1)),
    blocks,
  };

  const empty =
    !model.summary &&
    model.deprecated === null &&
    model.returns === null &&
    model.modifiers.length === 0 &&
    model.blocks.length === 0;

  return empty ? null : model;
}

/**
 * Plain description used for page metadata and search.
 *
 * @param {import("typedoc").CommentDisplayPart[]} parts
 */
export function toPlainText(parts) {
  const text = parts
    .map((part) =>
      part.kind === "code" ? part.text.replaceAll(/`+/gu, "") : part.text,
    )
    .join("");

  return (text.split(/\n\s*\n/u)[0] ?? "").replaceAll(/\s+/gu, " ").trim();
}

/**
 * @param {import("typedoc").CommentDisplayPart[]} parts
 * @param {import("./context.js").ModelContext} ctx
 */
export function partsToMarkdown(parts, ctx) {
  return parts
    .map((part) => {
      switch (part.kind) {
        case "text":
        case "code":
          return part.text;

        case "inline-tag":
          return inlineTagToMarkdown(part, ctx);

        default:
          return part.text;
      }
    })
    .join("")
    .trim();
}

function inlineTagToMarkdown(part, ctx) {
  if (!["@link", "@linkcode", "@linkplain"].includes(part.tag)) {
    return part.text;
  }

  const href = resolveTarget(part.target, ctx);
  const deprecation =
    href && typeof part.target === "object" && part.target !== null
      ? ctx.deprecationFor(part.target)
      : null;

  // Deprecated targets need a class and title, so they are written as HTML.
  if (deprecation) {
    const text = escapeHtml(part.text);
    const label = part.tag === "@linkcode" ? `<code>${text}</code>` : text;
    const title = escapeHtml(deprecationTitle(deprecation));

    return `<a href="${escapeHtml(href)}" class="tdk-deprecated" title="${title}">${label}</a>`;
  }

  const label =
    part.tag === "@linkcode" ? "`" + part.text + "`" : escapeLabel(part.text);

  return href ? `[${label}](${href})` : label;
}

/** Tooltip text for anything pointing at a deprecated API. */
export function deprecationTitle(deprecation) {
  const owner = deprecation.inheritedFrom
    ? ` (${deprecation.inheritedFrom} is deprecated)`
    : "";
  return deprecation.reason
    ? `Deprecated${owner}: ${deprecation.reason}`
    : `Deprecated${owner}`;
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function resolveTarget(target, ctx) {
  if (!target) {
    return null;
  }

  if (typeof target === "string") {
    return target;
  }

  if (
    typeof target === "object" &&
    typeof target.id === "number" &&
    "kind" in target
  ) {
    return ctx.hrefForReflection(target);
  }

  return null;
}

/**
 * `@example` content without a code fence is treated as TypeScript, the
 * same way the default TypeDoc theme does.
 *
 * @param {import("typedoc").CommentTag} block
 */
function blockMarkdown(block, ctx) {
  const markdown = partsToMarkdown(block.content, ctx);

  if (block.tag === "@example" && !markdown.includes("```")) {
    return "```ts\n" + markdown + "\n```";
  }

  if (
    (block.tag === "@defaultValue" || block.tag === "@default") &&
    !markdown.includes("`")
  ) {
    return "`" + markdown + "`";
  }

  return markdown;
}

function blockRank(tag) {
  const index = BLOCK_ORDER.indexOf(tag);
  return index === -1 ? BLOCK_ORDER.length : index;
}

function escapeLabel(text) {
  return text.replaceAll(/[[\]]/gu, "\\$&");
}

function titleCase(text) {
  return (
    text.charAt(0).toUpperCase() +
    text.slice(1).replaceAll(/([a-z])([A-Z])/gu, "$1 $2")
  );
}
