/**
 * Syntax tokens for rendered code: `[text, kind?, href?]`.
 *
 * Kinds map to CSS classes in the generated components:
 * `kw` keyword, `name` declared name, `ref` type reference, `tp` type
 * parameter, `prim` intrinsic, `lit` literal, `pn` punctuation, `param`
 * parameter name, `prop` property name. Plain text has no kind.
 *
 * @typedef {[string] | [string, string | null] | [string, string | null, string]} Token
 */

export class TokenWriter {
  /** @type {Token[]} */
  tokens = [];

  /**
   * @param {string} text
   * @param {string | null} [kind]
   * @param {string | null} [href]
   */
  push(text, kind = null, href = null) {
    if (text === "") {
      return this;
    }

    const last = this.tokens.at(-1);

    // Never leave trailing spaces before a line break, e.g. after `?: `.
    if (last && text.startsWith("\n") && last.length < 3) {
      last[0] = last[0].trimEnd();
    }

    if (last && !href && last.length < 3 && (last[1] ?? null) === kind) {
      last[0] += text;
      return this;
    }

    if (href) {
      this.tokens.push([text, kind, href]);
    } else if (kind) {
      this.tokens.push([text, kind]);
    } else {
      this.tokens.push([text]);
    }

    return this;
  }

  /** @param {Token[]} tokens */
  append(tokens) {
    for (const [text, kind, href] of tokens) {
      this.push(text, kind ?? null, href ?? null);
    }

    return this;
  }

  kw(text) {
    return this.push(text, "kw");
  }

  pn(text) {
    return this.push(text, "pn");
  }

  text(text) {
    return this.push(text);
  }
}

/** @param {Token[]} tokens */
export function tokensToText(tokens) {
  return tokens.map((token) => token[0]).join("");
}

/** Longest line length of a token run, used to decide when to wrap. */
export function tokensWidth(tokens) {
  return Math.max(
    ...tokensToText(tokens)
      .split("\n")
      .map((line) => line.length),
  );
}
