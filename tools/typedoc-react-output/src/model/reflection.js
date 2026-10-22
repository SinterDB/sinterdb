import { ReflectionKind } from "typedoc";

import { createCommentModel } from "./comments.js";
import { getTypeDeclaration } from "./context.js";
import { createHierarchyNode } from "./hierarchy.js";
import { getKindLabel, getKindName } from "./navigation.js";
import { TokenWriter, tokensWidth } from "./tokens.js";
import {
  propertyName,
  writeParameter,
  writeReflectionType,
  writeType,
  writeTypeParameter,
  writeTypeParameters,
} from "./types.js";

const SIGNATURE_WIDTH = 80;
const BLOCK = { block: true, indent: "", position: "none" };
const INLINE = { block: false, indent: "", position: "none" };

/**
 * Build the render-ready model for one API page.
 *
 * @param {import("./context.js").PagePlan} plan
 * @param {import("./context.js").ModelContext} ctx
 */
export function createPageModel(plan, ctx) {
  return ctx.withOwner(
    {
      name: plan.reflection.name,
      href: plan.href,
      kind: getKindName(plan.reflection.kind),
    },
    () => buildPageModel(plan, ctx),
  );
}

function buildPageModel(plan, ctx) {
  const { reflection } = plan;
  const comment = createCommentModel(reflection.comment, ctx);
  const isFunction = reflection.kindOf(ReflectionKind.Function);

  const signatures = (reflection.signatures ?? []).map((signature) =>
    createSignatureModel(signature, ctx, {
      prefix: isFunction ? "function" : null,
      name: isFunction ? reflection.name : null,
    }),
  );

  // Functions document everything on their signature. With a single
  // signature its summary moves up to the page header so it isn't empty.
  const promote =
    isFunction &&
    !comment &&
    signatures.length === 1 &&
    signatures[0].comment !== null;
  const firstSignatureComment = isFunction
    ? createCommentModel(reflection.signatures?.[0]?.comment, ctx)
    : null;
  const headerComment = promote
    ? { ...firstSignatureComment, blocks: [] }
    : comment;

  const sections = [];

  if (reflection.indexSignatures?.length) {
    sections.push({
      id: "index-signatures",
      title:
        reflection.indexSignatures.length > 1
          ? "Index signatures"
          : "Index signature",
      members: reflection.indexSignatures.map((signature, index) => {
        const signatureComment = createCommentModel(signature.comment, ctx);

        return {
          ...emptyMember(signature, ctx),
          name: `[${signature.parameters?.map((parameter) => parameter.name).join(", ") ?? ""}]`,
          anchor:
            index === 0 ? "index-signature" : `index-signature-${index + 1}`,
          code: indexSignatureCode(signature, ctx),
          comment: signatureComment ? withoutPlain(signatureComment) : null,
        };
      }),
    });
  }

  if (plan.typeMembers.length > 0) {
    const allProperties = plan.typeMembers.every((member) =>
      member.kindOf(ReflectionKind.Property),
    );
    sections.push({
      id: "type-declaration",
      title: allProperties ? "Properties" : "Members",
      members: plan.typeMembers.map((member) => createMemberModel(member, ctx)),
    });
  }

  for (const section of plan.sections) {
    sections.push({
      id: section.id,
      title: section.title,
      members: section.members.map((member) => createMemberModel(member, ctx)),
    });
  }

  const signatureSection =
    signatures.length > 0
      ? {
          id: "signatures",
          title: isFunction
            ? signatures.length > 1
              ? "Overloads"
              : "Signature"
            : signatures.length > 1
              ? "Call signatures"
              : "Call signature",
        }
      : null;

  return {
    id: reflection.id,
    name: reflection.name,
    kind: getKindName(reflection.kind),
    label: getKindLabel(reflection.kind),
    href: plan.href,
    since: ctx.sinceFor(reflection),
    description: (comment ?? firstSignatureComment)?.plain ?? "",
    badges: withDeprecated(createBadges(reflection, comment), reflection, ctx),
    declaration: isFunction ? null : declarationCode(reflection, ctx),
    comment: headerComment ? withoutPlain(headerComment) : null,
    typeParameters: (reflection.typeParameters ?? []).map((parameter) =>
      createTypeParameterModel(parameter, ctx),
    ),
    // The inheritance tree links both ways, so it doesn't count as "used by".
    hierarchy: ctx.options.features.hierarchy
      ? ctx.withOwner(null, () => createHierarchyNode(reflection, ctx))
      : null,
    signatureSection,
    signatures: promote
      ? signatures.map((signature) => ({
          ...signature,
          comment: { ...signature.comment, summary: "" },
        }))
      : signatures,
    sections,
    toc: createToc(signatureSection, sections),
    sources: ctx.sources.resolve(reflection),
  };
}

/**
 * @param {import("typedoc").DeclarationReflection} member
 * @param {import("./context.js").ModelContext} ctx
 */
export function createMemberModel(member, ctx) {
  const href = ctx.anchorFor(member) ? ctx.hrefForReflection(member) : null;

  // Members with their own anchor become the owner of what they reference;
  // properties of an inline parameter type stay with their method.
  if (!href || !ctx.owner) {
    return buildMemberModel(member, ctx);
  }

  return ctx.withOwner(
    {
      name: `${ctx.owner.name}.${member.name}`,
      href,
      kind: getKindName(member.kind),
    },
    () => buildMemberModel(member, ctx),
  );
}

function buildMemberModel(member, ctx) {
  const comment = createCommentModel(member.comment, ctx);
  const model = {
    ...emptyMember(member, ctx),
    badges: withDeprecated(createBadges(member, comment), member, ctx),
    since: ctx.sinceFor(member),
    comment: comment ? withoutPlain(comment) : null,
    relations: createRelations(member, ctx),
  };

  if (member.kindOf(ReflectionKind.Accessor)) {
    model.signatures = [member.getSignature, member.setSignature]
      .filter(Boolean)
      .map((signature) =>
        createSignatureModel(signature, ctx, {
          prefix: signature === member.getSignature ? "get" : "set",
          name: member.name,
          isStatic: member.flags.isStatic,
          returnType: signature === member.getSignature,
        }),
      );
  } else if (member.signatures?.length) {
    const isConstructor = member.kindOf(ReflectionKind.Constructor);
    model.signatures = member.signatures.map((signature) =>
      createSignatureModel(signature, ctx, {
        prefix: isConstructor ? "new" : null,
        name: isConstructor
          ? (member.parent?.name ?? signature.name)
          : member.name,
        isStatic: member.flags.isStatic,
        isAbstract: member.flags.isAbstract,
        returnType: !isConstructor,
        optional: member.flags.isOptional,
      }),
    );
  } else {
    model.code = memberCode(member, ctx);
    model.members = (getTypeDeclaration(member)?.children ?? []).map((child) =>
      createMemberModel(child, ctx),
    );
  }

  return model;
}

function emptyMember(reflection, ctx) {
  return {
    id: reflection.id,
    name: reflection.name,
    anchor: ctx.anchorFor(reflection),
    kind: getKindName(reflection.kind),
    deprecated: ctx.deprecationFor(reflection) !== null,
    since: null,
    label: getKindLabel(reflection.kind),
    badges: [],
    code: null,
    comment: null,
    signatures: [],
    members: [],
    relations: [],
    sources: ctx.sources.resolve(reflection),
  };
}

/**
 * @param {import("typedoc").SignatureReflection} signature
 * @param {import("./context.js").ModelContext} ctx
 * @param {{ prefix?: string | null; name?: string | null; isStatic?: boolean; isAbstract?: boolean; returnType?: boolean; optional?: boolean }} options
 */
function createSignatureModel(signature, ctx, options) {
  const comment = createCommentModel(signature.comment, ctx);

  return {
    id: signature.id,
    code: signatureCode(signature, ctx, options),
    comment: comment ? withoutPlain({ ...comment, returns: null }) : null,
    typeParameters: (signature.typeParameters ?? []).map((parameter) =>
      createTypeParameterModel(parameter, ctx),
    ),
    parameters: (signature.parameters ?? []).map((parameter) =>
      createParameterModel(parameter, ctx),
    ),
    returns:
      options.returnType === false ||
      !signature.type ||
      (isVoid(signature.type) && !comment?.returns)
        ? null
        : {
            code: tokens((out) => writeType(out, signature.type, ctx, INLINE)),
            html: comment?.returns ?? null,
          },
    sources: ctx.sources.resolve(signature),
  };
}

/** @param {import("typedoc").ParameterReflection} parameter */
function createParameterModel(parameter, ctx) {
  const comment = createCommentModel(parameter.comment, ctx);
  const declaration =
    parameter.type?.type === "reflection" ? parameter.type.declaration : null;

  return {
    name: parameter.name,
    code: tokens((out) => writeParameter(out, parameter, ctx, INLINE)),
    comment: comment ? withoutPlain(comment) : null,
    members: (declaration?.children ?? []).map((child) =>
      createMemberModel(child, ctx),
    ),
  };
}

/** @param {import("typedoc").TypeParameterReflection} parameter */
function createTypeParameterModel(parameter, ctx) {
  const comment = createCommentModel(parameter.comment, ctx);

  return {
    name: parameter.name,
    code: tokens((out) => writeTypeParameter(out, parameter, ctx)),
    comment: comment ? withoutPlain(comment) : null,
  };
}

function signatureCode(signature, ctx, options) {
  const write = (out, wrap) => {
    if (options.isStatic) {
      out.kw("static ");
    }
    if (options.isAbstract) {
      out.kw("abstract ");
    }
    if (options.prefix) {
      out.kw(`${options.prefix} `);
    }
    if (options.name) {
      out.push(propertyName(options.name), "name");
    }
    if (options.optional) {
      out.pn("?");
    }

    writeTypeParameters(out, signature.typeParameters, ctx);
    out.pn("(");

    const parameters = signature.parameters ?? [];
    parameters.forEach((parameter, index) => {
      if (wrap) {
        out.text("\n  ");
      } else if (index > 0) {
        out.pn(", ");
      }
      writeParameter(out, parameter, ctx, INLINE);
      if (wrap) {
        out.pn(",");
      }
    });

    if (wrap) {
      out.text("\n");
    }
    out.pn(")");

    if (options.returnType !== false && signature.type) {
      out.pn(": ");
      writeType(out, signature.type, ctx, INLINE);
    }
  };

  const compact = tokens((out) => write(out, false));

  if (
    tokensWidth(compact) <= SIGNATURE_WIDTH ||
    !signature.parameters?.length
  ) {
    return compact;
  }

  return tokens((out) => write(out, true));
}

function indexSignatureCode(signature, ctx) {
  return tokens((out) => {
    if (signature.flags.isReadonly) {
      out.kw("readonly ");
    }
    out.pn("[");
    signature.parameters?.forEach((parameter, index) => {
      if (index > 0) {
        out.pn(", ");
      }
      out.push(parameter.name, "param");
      out.pn(": ");
      writeType(out, parameter.type, ctx, INLINE);
    });
    out.pn("]: ");
    writeType(out, signature.type, ctx, BLOCK);
  });
}

/**
 * Property, variable-like and enum member declarations.
 *
 * @param {import("typedoc").DeclarationReflection} member
 */
function memberCode(member, ctx) {
  return tokens((out) => {
    if (member.flags.isStatic) {
      out.kw("static ");
    }
    if (member.flags.isAbstract) {
      out.kw("abstract ");
    }
    if (member.flags.isReadonly) {
      out.kw("readonly ");
    }

    out.push(propertyName(member.name), "name");

    if (member.kindOf(ReflectionKind.EnumMember)) {
      if (member.type) {
        out.pn(" = ");
        writeType(out, member.type, ctx, INLINE);
      }
      return;
    }

    out.pn(member.flags.isOptional ? "?: " : ": ");
    writeType(out, member.type, ctx, BLOCK);

    if (member.defaultValue && member.defaultValue !== "...") {
      out.pn(" = ");
      out.text(member.defaultValue);
    }
  });
}

/**
 * The declaration shown under a page title, e.g.
 * `class SinterServerError extends SinterError`.
 *
 * @param {import("typedoc").DeclarationReflection} reflection
 */
function declarationCode(reflection, ctx) {
  return tokens((out) => {
    const name = () => {
      out.push(reflection.name, "name");
      writeTypeParameters(out, reflection.typeParameters, ctx);
    };

    const list = (keyword, types) => {
      if (!types?.length) {
        return;
      }
      out.kw(` ${keyword} `);
      types.forEach((type, index) => {
        if (index > 0) {
          out.pn(", ");
        }
        writeType(out, type, ctx, INLINE);
      });
    };

    switch (reflection.kind) {
      case ReflectionKind.Class:
        if (reflection.flags.isAbstract) {
          out.kw("abstract ");
        }
        out.kw("class ");
        name();
        list("extends", reflection.extendedTypes);
        list("implements", reflection.implementedTypes);
        break;

      case ReflectionKind.Interface:
        out.kw("interface ");
        name();
        list("extends", reflection.extendedTypes);
        break;

      case ReflectionKind.TypeAlias:
        out.kw("type ");
        name();
        out.pn(" = ");
        if (reflection.type) {
          writeType(out, reflection.type, ctx, BLOCK);
        } else {
          // Object type aliases are converted with their members on the alias.
          writeReflectionType(out, reflection, ctx, BLOCK);
        }
        break;

      case ReflectionKind.Variable:
        out.kw(reflection.flags.isConst ? "const " : "let ");
        out.push(reflection.name, "name");
        out.pn(": ");
        writeType(out, reflection.type, ctx, BLOCK);
        break;

      case ReflectionKind.Enum:
        if (reflection.flags.isConst) {
          out.kw("const ");
        }
        out.kw("enum ");
        out.push(reflection.name, "name");
        break;

      default:
        out.kw(
          `${ReflectionKind.singularString(reflection.kind).toLowerCase()} `,
        );
        out.push(reflection.name, "name");
    }
  });
}

function createRelations(member, ctx) {
  const relation = (label, type) => {
    if (!type) {
      return [];
    }

    // Show `SinterError.code`, not just `code`.
    const target = type.reflection;
    const name =
      target?.parent && !target.parent.isProject()
        ? `${target.parent.name}.${target.name}`
        : type.toString();

    const href = ctx.hrefForReference(type);

    // Relations to outside types (`Overrides EventEmitter.constructor`)
    // follow the same rule as inherited external members.
    if (!target && !ctx.options.features.externalInherited) {
      return [];
    }

    return [{ label, name, href }];
  };

  return [
    ...relation("Inherited from", member.inheritedFrom),
    ...relation("Overrides", member.overwrites),
    ...relation("Implementation of", member.implementationOf),
  ];
}

function createBadges(reflection, comment) {
  const badges = [];

  if (comment?.deprecated !== null && comment?.deprecated !== undefined) {
    badges.push("deprecated");
  }

  badges.push(...(comment?.modifiers ?? []));

  if (reflection.kindOf(ReflectionKind.ClassMember)) {
    // `readonly` and `?` already show in the declaration.
    for (const [flag, badge] of [
      ["isStatic", "static"],
      ["isAbstract", "abstract"],
      ["isProtected", "protected"],
    ]) {
      if (reflection.flags[flag]) {
        badges.push(badge);
      }
    }
  } else if (reflection.flags.isAbstract) {
    badges.push("abstract");
  }

  return badges;
}

/**
 * Adds the badge when the reflection is deprecated without its own tag: every
 * overload is deprecated, or its class or interface is.
 */
function withDeprecated(badges, reflection, ctx) {
  return !badges.includes("deprecated") && ctx.deprecationFor(reflection)
    ? ["deprecated", ...badges]
    : badges;
}

function createToc(signatureSection, sections) {
  const toc = [];

  if (signatureSection) {
    toc.push({
      id: signatureSection.id,
      title: signatureSection.title,
      items: [],
    });
  }

  for (const section of sections) {
    toc.push({
      id: section.id,
      title: section.title,
      items: section.members
        .filter((member) => member.anchor)
        .map((member) => ({
          anchor: member.anchor,
          name: member.name,
          kind: member.kind,
          deprecated: member.deprecated,
        })),
    });
  }

  return toc;
}

/** Drop the fields that are only used while building the model. */
function withoutPlain(comment) {
  const { summary, short, deprecated, modifiers, blocks } = comment;
  return { summary, short, deprecated, modifiers, blocks };
}

function isVoid(type) {
  return (
    type.type === "intrinsic" &&
    (type.name === "void" || type.name === "undefined")
  );
}

/** @param {(out: TokenWriter) => void} write */
function tokens(write) {
  const out = new TokenWriter();
  write(out);
  return out.tokens;
}
