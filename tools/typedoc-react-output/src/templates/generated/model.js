/**
 * TypeScript shape of the generated data. Shared by `_generated/model.ts`
 * and the optional `_types` declarations so the two can't drift apart.
 */
export const MODEL_TYPES = `/**
 * A run of syntax-highlighted code: \`[text, kind?, href?]\`.
 *
 * Kinds: \`kw\` keyword, \`name\` declared name, \`ref\` type reference,
 * \`tp\` type parameter, \`prim\` intrinsic type, \`lit\` literal, \`pn\`
 * punctuation, \`param\` parameter, \`prop\` property.
 */
export type ApiToken = readonly [text: string, kind?: string | null, href?: string];

export type ApiCode = readonly ApiToken[];

export interface ApiCommentBlock {
  readonly tag: string;
  readonly title: string;
  /** Rendered HTML. */
  readonly html: string;
}

export interface ApiComment {
  /** Rendered HTML of the summary. */
  readonly summary: string;
  /** Inline HTML of the first summary paragraph. */
  readonly short: string;
  /** Rendered HTML; an empty string when deprecated without a reason. */
  readonly deprecated: string | null;
  /** Modifier tags such as \`beta\`. */
  readonly modifiers: readonly string[];
  readonly blocks: readonly ApiCommentBlock[];
}

export interface ApiSource {
  readonly path: string;
  readonly line: number;
  readonly url: string | null;
}

export interface ApiTypeParameter {
  readonly name: string;
  readonly code: ApiCode;
  readonly comment: ApiComment | null;
}

export interface ApiParameter {
  readonly name: string;
  readonly code: ApiCode;
  readonly comment: ApiComment | null;
  /** Properties when the parameter is typed as an object literal. */
  readonly members: readonly ApiMember[];
}

export interface ApiSignature {
  readonly id: number;
  readonly code: ApiCode;
  readonly comment: ApiComment | null;
  readonly typeParameters: readonly ApiTypeParameter[];
  readonly parameters: readonly ApiParameter[];
  readonly returns: {
    readonly code: ApiCode;
    readonly html: string | null;
  } | null;
  readonly sources: readonly ApiSource[];
}

export interface ApiRelation {
  readonly label: string;
  readonly name: string;
  readonly href: string | null;
}

export interface ApiMember {
  readonly id: number;
  readonly name: string;
  readonly anchor: string | null;
  /** Kind identifier, e.g. \`property\` or \`type-alias\`. */
  readonly kind: string;
  /** Human-readable kind, e.g. \`Property\`. */
  readonly label: string;
  /** Deprecated itself, through every overload, or through its parent. */
  readonly deprecated: boolean;
  /** Version from \`@since\`. */
  readonly since: string | null;
  readonly badges: readonly string[];
  /** Declaration for members without signatures. */
  readonly code: ApiCode | null;
  readonly comment: ApiComment | null;
  readonly signatures: readonly ApiSignature[];
  /** Properties when the member is typed as an object literal. */
  readonly members: readonly ApiMember[];
  readonly relations: readonly ApiRelation[];
  readonly sources: readonly ApiSource[];
}

export interface ApiSection {
  readonly id: string;
  readonly title: string;
  readonly members: readonly ApiMember[];
}

export interface ApiTocEntry {
  readonly id: string;
  readonly title: string;
  readonly items: readonly {
    readonly anchor: string;
    readonly name: string;
    readonly kind: string;
    readonly deprecated: boolean;
  }[];
}

export interface ApiHierarchyNode {
  readonly name: string;
  readonly href: string | null;
  readonly kind: string | null;
  readonly deprecated: boolean;
  readonly current: boolean;
  readonly children: readonly ApiHierarchyNode[];
}

export interface ApiPage {
  readonly id: number;
  readonly name: string;
  readonly kind: string;
  readonly label: string;
  readonly href: string;
  /** Version from \`@since\`. */
  readonly since: string | null;
  /** Plain-text summary for metadata. */
  readonly description: string;
  readonly badges: readonly string[];
  readonly declaration: ApiCode | null;
  readonly comment: ApiComment | null;
  readonly typeParameters: readonly ApiTypeParameter[];
  readonly hierarchy: ApiHierarchyNode | null;
  readonly signatureSection: {
    readonly id: string;
    readonly title: string;
  } | null;
  readonly signatures: readonly ApiSignature[];
  readonly sections: readonly ApiSection[];
  readonly toc: readonly ApiTocEntry[];
  readonly sources: readonly ApiSource[];
  /** Pages and members whose signatures mention this page. */
  readonly usedBy: readonly ApiUsage[];
}

export interface ApiUsage {
  /** Qualified name, e.g. \`SinterCollection.find\`. */
  readonly name: string;
  readonly href: string;
  readonly kind: string;
}

export interface ApiNavigationItem {
  readonly id: number;
  readonly name: string;
  readonly href: string;
  readonly kind: string;
  readonly deprecated: boolean;
}

export interface ApiNavigationGroup {
  readonly id: string;
  readonly title: string;
  readonly items: readonly ApiNavigationItem[];
}

export interface ApiIndexItem extends ApiNavigationItem {
  readonly label: string;
  readonly since: string | null;
  /** Inline HTML of the first summary paragraph. */
  readonly short: string;
}

export interface ApiIndexGroup {
  readonly id: string;
  readonly title: string;
  readonly items: readonly ApiIndexItem[];
}

export interface ApiProject {
  readonly name: string;
  readonly href: string;
  /** Rendered HTML of the project comment, if any. */
  readonly summary: string;
  readonly hierarchyHref: string | null;
  readonly navigation: readonly ApiNavigationGroup[];
  /** Every deprecated page and member, so links anywhere can be marked. */
  readonly deprecated: readonly ApiDeprecation[];
  /** The newest \`@since\` version and what it added, if any \`@since\` tags exist. */
  readonly newIn: ApiNewIn | null;
}

export interface ApiNewIn {
  readonly version: string;
  readonly items: readonly {
    readonly name: string;
    readonly kind: string;
    readonly href: string;
  }[];
}

/** One page or member, for search and hover previews. */
export interface ApiSearchEntry {
  readonly name: string;
  /** Page name for members, \`null\` for pages. */
  readonly parent: string | null;
  readonly kind: string;
  readonly href: string;
  /** Plain-text first sentence or paragraph. */
  readonly summary: string;
  /** Declaration or first signature on one line, truncated. */
  readonly code: string;
  readonly deprecated: boolean;
  readonly since: string | null;
}

export interface ApiDeprecation {
  /** Qualified name, e.g. \`SinterCollection.find\`. */
  readonly name: string;
  readonly href: string;
  readonly kind: string;
  /** Plain text from \`@deprecated\`, may be empty. */
  readonly reason: string;
  /** Name of the deprecated parent when only the parent is deprecated. */
  readonly inheritedFrom: string | null;
}
`;

export function renderGeneratedModelTemplate() {
  return MODEL_TYPES;
}
