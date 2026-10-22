import { readFile } from "node:fs/promises";
import { join } from "node:path";

import GithubSlugger from "github-slugger";

import type { ApiSearchEntry } from "@/app/docs/api/_generated/model";
import { docsPages } from "@/components/docs/nav";

const GUIDES = join(process.cwd(), "src/app/docs/(guides)");

/**
 * Search entries for the hand-written guides: one per page (its title and
 * description) and one per `##` heading, with the section's first paragraph
 * as its summary. Read from the MDX files at build time, so a new heading is
 * searchable without any extra step.
 */
export async function getGuideSearchEntries(): Promise<ApiSearchEntry[]> {
  const pages = await Promise.all(docsPages.map(readGuide));
  return pages.flat();
}

async function readGuide(page: (typeof docsPages)[number]) {
  const slug = page.href.replace(/^\/docs\/?/u, "");
  const source = await readFile(join(GUIDES, slug, "page.mdx"), "utf8");

  const title = /^# (.+)$/mu.exec(source)?.[1]?.trim() ?? page.label;
  const description =
    /description:\s*"((?:[^"\\]|\\.)*)"/u.exec(source)?.[1] ?? "";

  // Same slugs as rehype-slug, which numbers repeated headings the same way.
  const slugger = new GithubSlugger();
  slugger.slug(title);

  // Code blocks can contain lines that look like headings.
  const prose = source.replaceAll(/^```[\s\S]*?^```/gmu, "");

  const sections = [...prose.matchAll(/^## (.+)$/gmu)].map((match) => {
    const text = plainText(match[1]);

    return entry({
      name: text,
      parent: title,
      kind: "section",
      href: `${page.href}#${slugger.slug(text)}`,
      summary: firstParagraph(prose.slice(match.index + match[0].length)),
    });
  });

  return [
    entry({
      name: title,
      parent: null,
      kind: "guide",
      href: page.href,
      summary: description,
    }),
    ...sections,
  ];
}

/**
 * The first paragraph of prose before the next heading, as plain text.
 * Components such as callouts and tables are skipped.
 */
function firstParagraph(section: string) {
  const body = section.split(/^#{1,6} /mu)[0] ?? "";
  const paragraph = body
    .split(/\n\s*\n/u)
    .map((block) => block.trim())
    .find((block) => block !== "" && !/^[<|>-]/u.test(block));

  if (!paragraph) {
    return "";
  }

  const text = plainText(componentsToText(paragraph)).replaceAll(/\s+/gu, " ");
  return text.length > 200 ? `${text.slice(0, 197)}...` : text;
}

/** `<Api name="X">label</Api>` becomes `label`, `<Api name="X" />` becomes `X`. */
function componentsToText(markdown: string) {
  return markdown
    .replaceAll(/<Api name="([^"]+)"\s*\/>/gu, "$1")
    .replaceAll(/<(\w+)[^>]*>([\s\S]*?)<\/\1>/gu, "$2")
    .replaceAll(/<[^>]+>/gu, "");
}

/** Heading text as rendered: no backticks, emphasis, or link syntax. */
function plainText(markdown: string) {
  return markdown
    .replaceAll(/`([^`]*)`/gu, "$1")
    .replaceAll(/\[([^\]]*)\]\([^)]*\)/gu, "$1")
    .replaceAll(/(\*\*|\*)(\S(?:.*?\S)?)\1/gu, "$2")
    .trim();
}

function entry(
  fields: Pick<ApiSearchEntry, "name" | "parent" | "kind" | "href"> &
    Partial<ApiSearchEntry>,
): ApiSearchEntry {
  return {
    summary: "",
    code: "",
    deprecated: false,
    since: null,
    ...fields,
  };
}
