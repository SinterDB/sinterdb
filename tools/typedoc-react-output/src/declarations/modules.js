const MODEL_TYPES = [
  "ApiToken",
  "ApiCode",
  "ApiCommentBlock",
  "ApiComment",
  "ApiSource",
  "ApiTypeParameter",
  "ApiParameter",
  "ApiSignature",
  "ApiRelation",
  "ApiMember",
  "ApiSection",
  "ApiTocEntry",
  "ApiHierarchyNode",
  "ApiPage",
  "ApiNavigationItem",
  "ApiNavigationGroup",
  "ApiIndexItem",
  "ApiIndexGroup",
  "ApiDeprecation",
  "ApiNewIn",
  "ApiSearchEntry",
  "ApiUsage",
  "ApiProject",
];

const RENDERER_TYPES = [
  "ApiShellProps",
  "ApiIndexPageProps",
  "ApiReflectionPageProps",
  "ApiHierarchyPageProps",
  "ApiSidebarProps",
  "ApiMemberCardProps",
  "ApiSignatureProps",
  "ApiParameterListProps",
  "ApiCodeProps",
  "ApiCommentProps",
  "ApiSourcesProps",
  "ApiKindIconProps",
];

export function renderModuleDeclarations({ moduleName }) {
  if (!moduleName) {
    return null;
  }

  const modelTypes = MODEL_TYPES.map(
    (name) => `  export type ${name} = import("./model").${name};`,
  ).join("\n");

  const rendererTypes = RENDERER_TYPES.map(
    (name) => `  export type ${name} = import("./renderer").${name};`,
  ).join("\n");

  return `declare module ${JSON.stringify(moduleName)} {
${modelTypes}
${rendererTypes}
}
`;
}
