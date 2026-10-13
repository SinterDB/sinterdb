import MarkdownIt from "markdown-it";
import { createHighlighter } from "shiki";

const LANGUAGES = [
  "typescript",
  "tsx",
  "javascript",
  "jsx",
  "json",
  "shellscript",
];

const LANGUAGE_ALIASES = {
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  sh: "shellscript",
  bash: "shellscript",
  shell: "shellscript",
  zsh: "shellscript",
  console: "shellscript",
  jsonc: "json",
};

/**
 * Markdown renderer for doc comments, with build-time syntax highlighting.
 * Highlighted code carries both light and dark colors as CSS variables so
 * the generated stylesheet can switch schemes without client JavaScript.
 *
 * @param {{ light: string; dark: string }} themes
 */
const COPY_BUTTON =
  '<button type="button" class="tdk-copy" data-tdk-copy aria-label="Copy code">Copy</button>';

export async function createMarkdownRenderer(themes) {
  const highlighter = await createHighlighter({
    themes: [themes.light, themes.dark],
    langs: LANGUAGES,
  });

  const md = new MarkdownIt({
    html: true,
    linkify: false,
    typographer: false,
    highlight(code, language) {
      const lang = resolveLanguage(language || "ts");

      if (!lang) {
        return "";
      }

      return highlighter.codeToHtml(code.replace(/\n$/u, ""), {
        lang,
        themes,
        defaultColor: false,
      });
    },
  });

  // Every fenced block gets the same frame and copy button as signatures.
  // The theme's copy handler reads the text from the <pre> at click time.
  const fence = md.renderer.rules.fence;
  md.renderer.rules.fence = (...args) =>
    `<div class="tdk-code-block">${fence(...args)}${COPY_BUTTON}</div>`;

  return {
    /** @param {string} markdown */
    render(markdown) {
      return md.render(markdown).trim();
    },

    /** @param {string} markdown */
    renderInline(markdown) {
      return md.renderInline(markdown).trim();
    },

    /**
     * @param {string} code
     * @param {string} [language]
     */
    code(code, language = "ts") {
      return md.render("```" + language + "\n" + code + "\n```").trim();
    },
  };
}

function resolveLanguage(language) {
  const lang =
    LANGUAGE_ALIASES[language.toLowerCase()] ?? language.toLowerCase();
  return LANGUAGES.includes(lang) ? lang : null;
}
