import Link from "next/link";
import type { ReactNode } from "react";

import { config } from "../_generated/config";
import type {
  ApiHierarchyNode,
  ApiIndexGroup,
  ApiPage,
  ApiSection,
  ApiTocEntry,
} from "../_generated/model";
import { project } from "../_generated/project";
import { Code } from "./code";
import { CopyHandler } from "./copy";
import { HoverPreview } from "./preview";
import { Badges, Comment, Deprecated, Html, Since } from "./comment";
import { HierarchyTree } from "./hierarchy";
import { deprecationOf } from "./deprecation";
import { KindIcon } from "./kind-icon";
import {
  isDocumented,
  MemberCard,
  ParameterList,
  SignatureView,
  Sources,
} from "./member";
import { Sidebar } from "./sidebar";
import { Toc } from "./toc";
import { cx } from "./utils";

/** Three-column layout: sidebar, content, and the page's table of contents. */
export function ApiShell({
  activeHref,
  toc = [],
  children,
}: {
  readonly activeHref: string | null;
  readonly toc?: readonly ApiTocEntry[];
  readonly children: ReactNode;
}) {
  const showToc = config.features.pageNavigation && toc.length > 0;

  return (
    <div className="tdk-root" data-scheme={config.colorScheme}>
      <div
        className="tdk-layout"
        data-sidebar={config.features.navigation}
        data-toc={showToc}
      >
        {config.features.navigation && (
          <Sidebar project={project} activeHref={activeHref} />
        )}
        <main className="tdk-main">{children}</main>
        {showToc && <Toc entries={toc} />}
      </div>
      <CopyHandler />
      <HoverPreview />
    </div>
  );
}

export function ApiIndexPage({
  groups,
}: {
  readonly groups: readonly ApiIndexGroup[];
}) {
  const total = groups.reduce((count, group) => count + group.items.length, 0);
  // Members of a deprecated class are covered by the class's own entry.
  const deprecated = project.deprecated.filter((item) => !item.inheritedFrom);

  return (
    <ApiShell
      activeHref={project.href}
      toc={[
        ...(project.newIn
          ? [{ id: "new", title: `New in ${project.newIn.version}`, items: [] }]
          : []),
        ...groups.map((group) => ({
          id: group.id,
          title: group.title,
          items: [],
        })),
        ...(deprecated.length > 0
          ? [{ id: "deprecated", title: "Deprecated", items: [] }]
          : []),
      ]}
    >
      <article className="tdk-page">
        <header className="tdk-header">
          <p className="tdk-eyebrow">API reference</p>
          <h1 className="tdk-title">{project.name}</h1>
          <Html html={project.summary} className="tdk-lead" />
          <p className="tdk-stats">
            {total} exports
            {groups.map((group) => (
              <span key={group.id}>
                {" · "}
                <a href={`#${group.id}`}>
                  {group.items.length} {group.title.toLowerCase()}
                </a>
              </span>
            ))}
            {project.hierarchyHref && (
              <>
                {" · "}
                <Link href={project.hierarchyHref}>hierarchy</Link>
              </>
            )}
            {deprecated.length > 0 && (
              <>
                {" · "}
                <a href="#deprecated" className="tdk-stats-deprecated">
                  {deprecated.length} deprecated
                </a>
              </>
            )}
          </p>
        </header>

        {project.newIn && (
          <section id="new" className="tdk-section">
            <SectionHeading id="new">
              New in {project.newIn.version}
            </SectionHeading>
            <ul className="tdk-used-by">
              {project.newIn.items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} prefetch={false}>
                    <KindIcon kind={item.kind} />
                    <code>{item.name}</code>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {groups.map((group) => (
          <section key={group.id} id={group.id} className="tdk-section">
            <SectionHeading id={group.id}>{group.title}</SectionHeading>
            <ul className="tdk-cards">
              {group.items.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="tdk-card">
                    <span className="tdk-card-title">
                      <KindIcon kind={item.kind} label={item.label} />
                      <span
                        className={
                          item.deprecated ? "tdk-deprecated" : undefined
                        }
                      >
                        {item.name}
                      </span>
                      {item.since && item.since === project.newIn?.version && (
                        <span
                          className="tdk-since"
                          title={`Added in ${item.since}`}
                        >
                          new
                        </span>
                      )}
                    </span>
                    {item.short && (
                      <span
                        className="tdk-card-text"
                        dangerouslySetInnerHTML={{
                          __html: stripLinks(item.short),
                        }}
                      />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {deprecated.length > 0 && (
          <section id="deprecated" className="tdk-section">
            <SectionHeading id="deprecated">Deprecated</SectionHeading>
            <p className="tdk-section-note">
              Still available, but avoid these in new code.
            </p>
            <ul className="tdk-deprecated-list">
              {deprecated.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} prefetch={false}>
                    <KindIcon kind={item.kind} />
                    <code className="tdk-deprecated">{item.name}</code>
                  </Link>
                  {item.reason && <span>{item.reason}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </ApiShell>
  );
}

export function ApiReflectionPage({ page }: { readonly page: ApiPage }) {
  return (
    <ApiShell activeHref={page.href} toc={page.toc}>
      <article className="tdk-page">
        <nav className="tdk-breadcrumbs" aria-label="Breadcrumb">
          <Link href={project.href}>{project.name}</Link>
          <span aria-hidden>/</span>
          <span>{page.label}</span>
        </nav>

        <header className="tdk-header">
          <p className="tdk-eyebrow">
            <KindIcon kind={page.kind} />
            {page.label}
            <Badges badges={page.badges} />
            <Since version={page.since} />
          </p>
          <h1 className="tdk-title">{page.name}</h1>
          {page.comment && (
            <Html html={page.comment.summary} className="tdk-lead" />
          )}
        </header>

        <Deprecated comment={page.comment} />
        {page.declaration && (
          <Code block code={page.declaration} className="tdk-declaration" />
        )}
        <Comment comment={page.comment} summary={false} />
        <Sources sources={page.sources} />

        {isDocumented(page.typeParameters) && (
          <section id="type-parameters" className="tdk-section">
            <ParameterList
              title="Type parameters"
              parameters={page.typeParameters}
            />
          </section>
        )}

        {page.hierarchy && (
          <section id="hierarchy" className="tdk-section tdk-section-compact">
            <h4 className="tdk-label">Hierarchy</h4>
            <HierarchyTree nodes={[page.hierarchy]} />
          </section>
        )}

        {page.signatureSection && (
          <section id={page.signatureSection.id} className="tdk-section">
            <SectionHeading id={page.signatureSection.id}>
              {page.signatureSection.title}
            </SectionHeading>
            {page.signatures.map((signature) => (
              <SignatureView key={signature.id} signature={signature} />
            ))}
          </section>
        )}

        <MemberIndex sections={page.sections} />

        {page.sections.map((section) => (
          <section key={section.id} id={section.id} className="tdk-section">
            <SectionHeading id={section.id}>{section.title}</SectionHeading>
            {section.members.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </section>
        ))}

        {page.usedBy.length > 0 && (
          <section id="used-by" className="tdk-section">
            <SectionHeading id="used-by">Used by</SectionHeading>
            <ul className="tdk-used-by">
              {page.usedBy.map((usage) => (
                <li key={usage.href}>
                  <Link href={usage.href} prefetch={false}>
                    <KindIcon kind={usage.kind} />
                    <code
                      className={cx(
                        deprecationOf(usage.href) && "tdk-deprecated",
                      )}
                    >
                      {usage.name}
                    </code>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Pager href={page.href} />
      </article>
    </ApiShell>
  );
}

/** Previous and next page, in sidebar order. */
function Pager({ href }: { readonly href: string }) {
  const items = project.navigation.flatMap((group) => group.items);
  const index = items.findIndex((item) => item.href === href);
  const previous = index > 0 ? items[index - 1] : null;
  const next = index >= 0 ? (items[index + 1] ?? null) : null;

  if (!previous && !next) {
    return null;
  }

  return (
    <nav className="tdk-pager" aria-label="Previous and next">
      {previous ? (
        <Link href={previous.href} className="tdk-pager-link" rel="prev">
          <span className="tdk-pager-label">Previous</span>
          <span
            className={cx(
              "tdk-pager-name",
              previous.deprecated && "tdk-deprecated",
            )}
          >
            ← {previous.name}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link href={next.href} className="tdk-pager-link" data-next rel="next">
          <span className="tdk-pager-label">Next</span>
          <span
            className={cx(
              "tdk-pager-name",
              next.deprecated && "tdk-deprecated",
            )}
          >
            {next.name} →
          </span>
        </Link>
      )}
    </nav>
  );
}

export function ApiHierarchyPage({
  nodes,
}: {
  readonly nodes: readonly ApiHierarchyNode[];
}) {
  return (
    <ApiShell activeHref={project.hierarchyHref}>
      <article className="tdk-page">
        <nav className="tdk-breadcrumbs" aria-label="Breadcrumb">
          <Link href={project.href}>{project.name}</Link>
          <span aria-hidden>/</span>
          <span>Hierarchy</span>
        </nav>

        <header className="tdk-header">
          <h1 className="tdk-title">Class hierarchy</h1>
          <p className="tdk-lead">
            How the exported classes and interfaces extend one another.
          </p>
        </header>

        {nodes.length > 0 ? (
          <div className="tdk-hierarchy">
            <HierarchyTree nodes={nodes} />
          </div>
        ) : (
          <p className="tdk-empty">
            Nothing in this API extends anything else.
          </p>
        )}
      </article>
    </ApiShell>
  );
}

/** Compact overview of every member; only worth it on larger pages. */
function MemberIndex({
  sections,
}: {
  readonly sections: readonly ApiSection[];
}) {
  const count = sections.reduce(
    (total, section) => total + section.members.length,
    0,
  );

  if (count < 6) {
    return null;
  }

  return (
    <nav className="tdk-index" aria-label="Members">
      {sections.map((section) => (
        <div key={section.id} className="tdk-index-group">
          <h4 className="tdk-label">{section.title}</h4>
          <ul>
            {section.members.map((member) =>
              member.anchor ? (
                <li key={member.id}>
                  <a href={`#${member.anchor}`}>
                    <KindIcon kind={member.kind} />
                    <span
                      className={
                        member.badges.includes("deprecated")
                          ? "tdk-deprecated"
                          : undefined
                      }
                    >
                      {member.name}
                    </span>
                  </a>
                </li>
              ) : null,
            )}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SectionHeading({
  id,
  children,
}: {
  readonly id: string;
  readonly children: ReactNode;
}) {
  return (
    <h2 className="tdk-section-title">
      {children}
      <a
        href={`#${id}`}
        className="tdk-anchor"
        aria-label="Link to this section"
      >
        #
      </a>
    </h2>
  );
}

/** Cards are links themselves, so links inside summaries become plain text. */
function stripLinks(html: string) {
  return html.replaceAll(/<a\b[^>]*>|<\/a>/gu, "");
}
