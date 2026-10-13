export function renderRendererDeclarations() {
  return `import type { ReactNode } from "react";

import type {
  ApiCode,
  ApiComment,
  ApiHierarchyNode,
  ApiIndexGroup,
  ApiMember,
  ApiPage,
  ApiParameter,
  ApiProject,
  ApiSignature,
  ApiSource,
  ApiTocEntry,
  ApiTypeParameter,
} from "./model";

export interface ApiShellProps {
  readonly activeHref: string | null;
  readonly toc?: readonly ApiTocEntry[];
  readonly children: ReactNode;
}

export interface ApiIndexPageProps {
  readonly groups: readonly ApiIndexGroup[];
}

export interface ApiReflectionPageProps {
  readonly page: ApiPage;
}

export interface ApiHierarchyPageProps {
  readonly nodes: readonly ApiHierarchyNode[];
}

export interface ApiSidebarProps {
  readonly project: ApiProject;
  readonly activeHref: string | null;
}

export interface ApiMemberCardProps {
  readonly member: ApiMember;
}

export interface ApiSignatureProps {
  readonly signature: ApiSignature;
}

export interface ApiParameterListProps {
  readonly title: string;
  readonly parameters: readonly (ApiParameter | ApiTypeParameter)[];
}

export interface ApiCodeProps {
  readonly code: ApiCode;
  readonly block?: boolean;
  readonly className?: string;
}

export interface ApiCommentProps {
  readonly comment: ApiComment | null;
  readonly summary?: boolean;
}

export interface ApiSourcesProps {
  readonly sources: readonly ApiSource[];
}

export interface ApiKindIconProps {
  readonly kind: string;
  readonly label?: string;
}
`;
}
