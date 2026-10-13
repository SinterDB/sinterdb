import { TokenWriter, tokensWidth } from "./tokens.js";

const WRAP_WIDTH = 72;
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/u;

/**
 * Where a type appears, used to decide when it needs parentheses.
 * @typedef {"none" | "arrayElement" | "unionMember" | "intersectionMember" | "operatorTarget" | "indexedObject" | "conditionalCheck" | "conditionalExtends" | "optionalElement"} TypePosition
 */

/**
 * @typedef {object} TypeRenderOptions
 * @property {boolean} [block] Allow multi-line output (declarations).
 * @property {string} [indent] Current indentation for multi-line output.
 * @property {TypePosition} [position]
 */

/**
 * Render a TypeDoc type into linked syntax tokens.
 *
 * @param {import("typedoc").SomeType | undefined} type
 * @param {import("./context.js").ModelContext} ctx
 * @param {TypeRenderOptions} [options]
 * @returns {import("./tokens.js").Token[]}
 */
export function typeTokens(type, ctx, options = {}) {
  const out = new TokenWriter();
  writeType(out, type, ctx, {
    block: false,
    indent: "",
    position: "none",
    ...options,
  });
  return out.tokens;
}

/**
 * @param {TokenWriter} out
 * @param {import("typedoc").SomeType | undefined} type
 * @param {import("./context.js").ModelContext} ctx
 * @param {Required<TypeRenderOptions>} options
 */
export function writeType(out, type, ctx, options) {
  if (!type) {
    out.push("unknown", "prim");
    return;
  }

  const parens = needsParens(type, options.position);
  const inner = { ...options, position: /** @type {TypePosition} */ ("none") };

  if (parens) {
    out.pn("(");
  }

  switch (type.type) {
    case "intrinsic":
      out.push(type.name, "prim");
      break;

    case "literal":
      out.push(formatLiteral(type.value), "lit");
      break;

    case "reference":
      writeReference(out, type, ctx, inner);
      break;

    case "array":
      writeType(out, type.elementType, ctx, {
        ...inner,
        position: "arrayElement",
      });
      out.pn("[]");
      break;

    case "union":
      writeJoined(out, type.types, " | ", ctx, inner, "unionMember");
      break;

    case "intersection":
      writeJoined(out, type.types, " & ", ctx, inner, "intersectionMember");
      break;

    case "tuple":
      out.pn("[");
      type.elements.forEach((element, index) => {
        if (index > 0) {
          out.pn(", ");
        }
        writeType(out, element, ctx, { ...inner, block: false });
      });
      out.pn("]");
      break;

    case "namedTupleMember":
      out.push(type.name, "param");
      out.pn(type.isOptional ? "?: " : ": ");
      writeType(out, type.element, ctx, { ...inner, block: false });
      break;

    case "optional":
      writeType(out, type.elementType, ctx, {
        ...inner,
        position: "optionalElement",
      });
      out.pn("?");
      break;

    case "rest":
      out.pn("...");
      writeType(out, type.elementType, ctx, inner);
      break;

    case "typeOperator":
      out.kw(`${type.operator} `);
      writeType(out, type.target, ctx, {
        ...inner,
        position: "operatorTarget",
      });
      break;

    case "query":
      out.kw("typeof ");
      writeReference(out, type.queryType, ctx, inner);
      break;

    case "indexedAccess":
      writeType(out, type.objectType, ctx, {
        ...inner,
        position: "indexedObject",
      });
      out.pn("[");
      writeType(out, type.indexType, ctx, { ...inner, block: false });
      out.pn("]");
      break;

    case "conditional":
      writeConditional(out, type, ctx, inner);
      break;

    case "inferred":
      out.kw("infer ");
      out.push(type.name, "tp");
      if (type.constraint) {
        out.kw(" extends ");
        writeType(out, type.constraint, ctx, inner);
      }
      break;

    case "mapped":
      writeMapped(out, type, ctx, inner);
      break;

    case "predicate":
      if (type.asserts) {
        out.kw("asserts ");
      }
      out.push(type.name, "param");
      if (type.targetType) {
        out.kw(" is ");
        writeType(out, type.targetType, ctx, inner);
      }
      break;

    case "templateLiteral":
      out.push("`" + escapeTemplate(type.head), "lit");
      for (const [part, text] of type.tail) {
        out.pn("${");
        writeType(out, part, ctx, { ...inner, block: false });
        out.pn("}");
        out.push(escapeTemplate(text), "lit");
      }
      out.push("`", "lit");
      break;

    case "reflection":
      writeReflectionType(out, type.declaration, ctx, inner);
      break;

    default:
      out.text(type.toString());
  }

  if (parens) {
    out.pn(")");
  }
}

function writeReference(out, type, ctx, options) {
  if (type.refersToTypeParameter) {
    out.push(type.name, "tp");
  } else {
    out.push(type.name, "ref", ctx.hrefForReference(type));
  }

  if (type.typeArguments?.length) {
    out.pn("<");
    type.typeArguments.forEach((argument, index) => {
      if (index > 0) {
        out.pn(", ");
      }
      writeType(out, argument, ctx, { ...options, block: false });
    });
    out.pn(">");
  }
}

function writeJoined(out, types, separator, ctx, options, position) {
  const member = { ...options, block: false, position };

  if (options.block && types.length > 1) {
    const compact = new TokenWriter();
    writeJoined(
      compact,
      types,
      separator,
      ctx,
      { ...options, block: false },
      position,
    );

    if (tokensWidth(compact.tokens) > WRAP_WIDTH - options.indent.length) {
      // Intersections of object types read best with the braces aligned:
      // `{ ... } & {` rather than a leading `&` on every line.
      if (separator === " & ") {
        types.forEach((type, index) => {
          if (index > 0) {
            out.pn(" & ");
          }
          writeType(out, type, ctx, { ...member, block: true });
        });
        return;
      }

      const indent = options.indent + "  ";
      for (const type of types) {
        out.text("\n" + indent);
        out.pn("| ");
        writeType(out, type, ctx, { ...member, block: true, indent });
      }
      return;
    }
  }

  types.forEach((type, index) => {
    if (index > 0) {
      out.pn(separator);
    }
    writeType(out, type, ctx, member);
  });
}

function writeConditional(out, type, ctx, options) {
  const compact = new TokenWriter();
  writeConditionalInline(compact, type, ctx, options);

  if (!options.block || tokensWidth(compact.tokens) <= WRAP_WIDTH) {
    out.append(compact.tokens);
    return;
  }

  const indent = options.indent + "  ";
  const branch = { ...options, indent };

  writeType(out, type.checkType, ctx, {
    ...options,
    block: false,
    position: "conditionalCheck",
  });
  out.kw(" extends ");
  writeType(out, type.extendsType, ctx, {
    ...options,
    block: false,
    position: "conditionalExtends",
  });
  out.text("\n" + indent);
  out.pn("? ");
  writeType(out, type.trueType, ctx, branch);
  out.text("\n" + indent);
  out.pn(": ");
  writeType(out, type.falseType, ctx, branch);
}

function writeConditionalInline(out, type, ctx, options) {
  const inline = { ...options, block: false };
  writeType(out, type.checkType, ctx, {
    ...inline,
    position: "conditionalCheck",
  });
  out.kw(" extends ");
  writeType(out, type.extendsType, ctx, {
    ...inline,
    position: "conditionalExtends",
  });
  out.pn(" ? ");
  writeType(out, type.trueType, ctx, inline);
  out.pn(" : ");
  writeType(out, type.falseType, ctx, inline);
}

function writeMapped(out, type, ctx, options) {
  const inline = { ...options, block: false };

  if (options.block) {
    const compact = new TokenWriter();
    writeMapped(compact, type, ctx, inline);

    if (tokensWidth(compact.tokens) > WRAP_WIDTH - options.indent.length) {
      const indent = options.indent + "  ";
      out.pn("{");
      out.text("\n" + indent);
      writeMappedEntry(out, type, ctx, { ...options, indent });
      out.pn(";");
      out.text("\n" + options.indent);
      out.pn("}");
      return;
    }
  }

  out.pn("{ ");
  writeMappedEntry(out, type, ctx, inline);
  out.pn(" }");
}

function writeMappedEntry(out, type, ctx, options) {
  const inline = { ...options, block: false };

  if (type.readonlyModifier === "+") {
    out.kw("readonly ");
  } else if (type.readonlyModifier === "-") {
    out.kw("-readonly ");
  }
  out.pn("[");
  out.push(type.parameter, "tp");
  out.kw(" in ");
  writeType(out, type.parameterType, ctx, inline);
  if (type.nameType) {
    out.kw(" as ");
    writeType(out, type.nameType, ctx, inline);
  }
  out.pn("]");
  out.pn(
    type.optionalModifier === "+"
      ? "?: "
      : type.optionalModifier === "-"
        ? "-?: "
        : ": ",
  );
  writeType(out, type.templateType, ctx, { ...options, position: "none" });
}

/**
 * Object literal and function types.
 *
 * @param {TokenWriter} out
 * @param {import("typedoc").DeclarationReflection} declaration
 */
export function writeReflectionType(out, declaration, ctx, options) {
  const children = declaration.children ?? [];
  const indexSignatures = declaration.indexSignatures ?? [];
  const signatures = declaration.signatures ?? [];

  if (
    children.length === 0 &&
    indexSignatures.length === 0 &&
    signatures.length === 1
  ) {
    writeSignatureInline(out, signatures[0], ctx, "arrow", options);
    return;
  }

  /** @type {Array<(writer: TokenWriter, memberOptions: object) => void>} */
  const members = [];

  for (const signature of indexSignatures) {
    members.push((writer, memberOptions) =>
      writeIndexSignature(writer, signature, ctx, memberOptions),
    );
  }

  for (const signature of signatures) {
    members.push((writer, memberOptions) =>
      writeSignatureInline(writer, signature, ctx, "call", memberOptions),
    );
  }

  for (const child of children) {
    members.push((writer, memberOptions) =>
      writeObjectMember(writer, child, ctx, memberOptions),
    );
  }

  if (members.length === 0) {
    out.pn("{}");
    return;
  }

  const compact = new TokenWriter();
  compact.pn("{ ");
  members.forEach((write, index) => {
    if (index > 0) {
      compact.pn("; ");
    }
    write(compact, { ...options, block: false });
  });
  compact.pn(" }");

  const wrap =
    options.block &&
    (members.length > 2 ||
      tokensWidth(compact.tokens) > WRAP_WIDTH - options.indent.length);

  if (!wrap) {
    out.append(compact.tokens);
    return;
  }

  const indent = options.indent + "  ";
  out.pn("{");
  for (const write of members) {
    out.text("\n" + indent);
    write(out, { ...options, indent, block: true });
    out.pn(";");
  }
  out.text("\n" + options.indent);
  out.pn("}");
}

function writeObjectMember(out, child, ctx, options) {
  const href = ctx.hrefForReflection(child);

  if (child.flags.isReadonly) {
    out.kw("readonly ");
  }

  if (child.signatures?.length && !child.type) {
    // Method shorthand. Overloads are joined, which is rare in literals.
    child.signatures.forEach((signature, index) => {
      if (index > 0) {
        out.pn("; ");
      }
      writeSignatureInline(out, signature, ctx, "method", options, href);
    });
    return;
  }

  out.push(propertyName(child.name), "prop", href);
  out.pn(child.flags.isOptional ? "?: " : ": ");

  const type = child.type ?? child.getSignature?.type;
  writeType(out, type, ctx, { ...options, position: "none" });
}

function writeIndexSignature(out, signature, ctx, options) {
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
    writeType(out, parameter.type, ctx, { ...options, block: false });
  });
  out.pn("]: ");
  writeType(out, signature.type, ctx, { ...options, position: "none" });
}

/**
 * @param {"arrow" | "call" | "method"} style
 */
function writeSignatureInline(
  out,
  signature,
  ctx,
  style,
  options,
  href = null,
) {
  const inline = { ...options, block: false, position: "none" };

  if (style === "method") {
    out.push(propertyName(signature.name), "prop", href);
  }
  if (signature.kind === 16384 /* ConstructorSignature */) {
    out.kw("new ");
  }

  writeTypeParameters(out, signature.typeParameters, ctx);
  out.pn("(");
  signature.parameters?.forEach((parameter, index) => {
    if (index > 0) {
      out.pn(", ");
    }
    writeParameter(out, parameter, ctx, inline);
  });
  out.pn(style === "arrow" ? ") => " : "): ");
  writeType(out, signature.type, ctx, inline);
}

/**
 * @param {TokenWriter} out
 * @param {import("typedoc").ParameterReflection} parameter
 */
export function writeParameter(out, parameter, ctx, options) {
  if (parameter.flags.isRest) {
    out.pn("...");
  }
  out.push(parameter.name, "param");
  out.pn(parameter.flags.isOptional ? "?: " : ": ");
  writeType(out, parameter.type, ctx, options);
  if (parameter.defaultValue && parameter.defaultValue !== "...") {
    out.pn(" = ");
    out.text(parameter.defaultValue);
  }
}

/**
 * @param {TokenWriter} out
 * @param {import("typedoc").TypeParameterReflection[] | undefined} parameters
 */
export function writeTypeParameters(out, parameters, ctx) {
  if (!parameters?.length) {
    return;
  }

  out.pn("<");
  parameters.forEach((parameter, index) => {
    if (index > 0) {
      out.pn(", ");
    }
    writeTypeParameter(out, parameter, ctx);
  });
  out.pn(">");
}

/**
 * @param {TokenWriter} out
 * @param {import("typedoc").TypeParameterReflection} parameter
 */
export function writeTypeParameter(out, parameter, ctx) {
  const inline = { block: false, indent: "", position: "none" };

  if (parameter.flags.isConst) {
    out.kw("const ");
  }
  if (parameter.varianceModifier) {
    out.kw(`${parameter.varianceModifier} `);
  }
  out.push(parameter.name, "tp");
  if (parameter.type) {
    out.kw(" extends ");
    writeType(out, parameter.type, ctx, inline);
  }
  if (parameter.default) {
    out.pn(" = ");
    writeType(out, parameter.default, ctx, inline);
  }
}

/**
 * @param {import("typedoc").SomeType} type
 * @param {TypePosition} position
 */
function needsParens(type, position) {
  if (position === "none") {
    return false;
  }

  switch (type.type) {
    case "union":
      return [
        "arrayElement",
        "intersectionMember",
        "operatorTarget",
        "indexedObject",
        "optionalElement",
      ].includes(position);

    case "intersection":
      return [
        "arrayElement",
        "operatorTarget",
        "indexedObject",
        "optionalElement",
      ].includes(position);

    case "conditional":
      return true;

    case "typeOperator":
      return ["arrayElement", "indexedObject"].includes(position);

    case "reflection":
      return (
        isFunctionType(type.declaration) && position !== "conditionalExtends"
      );

    default:
      return false;
  }
}

function isFunctionType(declaration) {
  return (
    !declaration.children?.length &&
    !declaration.indexSignatures?.length &&
    declaration.signatures?.length === 1
  );
}

export function propertyName(name) {
  return IDENTIFIER.test(name) || /^\[.*\]$/u.test(name)
    ? name
    : JSON.stringify(name);
}

function formatLiteral(value) {
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "object" && "value" in value) {
    // PseudoBigInt
    return `${value.negative ? "-" : ""}${value.value}n`;
  }
  return String(value);
}

function escapeTemplate(text) {
  return text
    .replaceAll("\\", "\\\\")
    .replaceAll("`", "\\`")
    .replaceAll("${", "\\${");
}
