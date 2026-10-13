import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import { isValidElement, type ComponentProps, type ReactElement } from "react";

import { CodeBlock, CodeChoices } from "@/components/docs/code-block";
import { Api, Callout, Card, Cards } from "@/components/docs/mdx";
import { resolveApiLink } from "@/lib/api-links";

type CodeElement = ReactElement<{
  readonly className?: string;
  readonly children?: string;
  readonly "data-title"?: string;
  readonly "data-nocopy"?: string;
  readonly "data-choices"?: string;
}>;

const components: MDXComponents = {
  // Fenced code blocks are highlighted on the server.
  pre({ children }) {
    if (!isValidElement(children)) {
      return <pre>{children}</pre>;
    }

    const {
      className,
      children: code,
      "data-title": title,
      "data-nocopy": noCopy,
      "data-choices": choices,
    } = (children as CodeElement).props;

    if (choices !== undefined) {
      return (
        <CodeChoices
          code={String(code ?? "")}
          choices={choices}
          lang={className?.replace(/^language-/u, "")}
          title={title}
          copy={noCopy === undefined}
        />
      );
    }

    return (
      <CodeBlock
        code={String(code ?? "").replace(/\n$/u, "")}
        lang={className?.replace(/^language-/u, "")}
        title={title}
        copy={noCopy === undefined}
      />
    );
  },

  // `[label](api:SinterClient)`, `/internal` and external links.
  a({ href = "", children, ...props }: ComponentProps<"a">) {
    if (href.startsWith("api:")) {
      const link = resolveApiLink(href.slice(4));

      return (
        <Link
          href={link.href}
          className={link.deprecated ? "docs-api-deprecated" : undefined}
          title={link.deprecated ?? undefined}
          {...props}
        >
          {children}
        </Link>
      );
    }

    if (href.startsWith("/") || href.startsWith("#")) {
      return (
        <Link href={href} {...props}>
          {children}
        </Link>
      );
    }

    return (
      <a href={href} target="_blank" rel="noreferrer" {...props}>
        {children}
      </a>
    );
  },

  Api,
  Callout,
  Card,
  Cards,
  CodeBlock,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
