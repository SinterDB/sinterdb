import Link from "next/link";

import type { ApiHierarchyNode } from "../_generated/model";
import { KindIcon } from "./kind-icon";
import { cx } from "./utils";

export function HierarchyTree({
  nodes,
}: {
  readonly nodes: readonly ApiHierarchyNode[];
}) {
  if (nodes.length === 0) {
    return null;
  }

  return (
    <ul className="tdk-tree">
      {nodes.map((node, index) => (
        <li key={`${node.name}-${index}`}>
          <span
            className="tdk-tree-node"
            data-deprecated={node.deprecated || undefined}
            title={node.deprecated ? "Deprecated" : undefined}
            aria-current={node.current ? "page" : undefined}
          >
            {node.kind && <KindIcon kind={node.kind} />}
            {node.href && !node.current ? (
              node.href.startsWith("/") ? (
                <Link
                  href={node.href}
                  prefetch={false}
                  className={cx(node.deprecated && "tdk-deprecated")}
                >
                  {node.name}
                </Link>
              ) : (
                <a
                  href={node.href}
                  target="_blank"
                  rel="noreferrer"
                  className={cx(node.deprecated && "tdk-deprecated")}
                >
                  {node.name}
                </a>
              )
            ) : (
              <span className={cx(node.deprecated && "tdk-deprecated")}>
                {node.name}
              </span>
            )}
          </span>
          <HierarchyTree nodes={node.children} />
        </li>
      ))}
    </ul>
  );
}
