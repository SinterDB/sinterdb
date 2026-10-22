import Link from "next/link";

import type {
  ApiMember,
  ApiParameter,
  ApiRelation,
  ApiSignature,
  ApiSource,
  ApiTypeParameter,
} from "../_generated/model";
import { config } from "../_generated/config";
import { Code } from "./code";
import { Badges, Comment, Deprecated, Html, Since } from "./comment";
import { KindIcon } from "./kind-icon";
import { cx } from "./utils";

export function MemberCard({ member }: { readonly member: ApiMember }) {
  return (
    <article id={member.anchor ?? undefined} className="tdk-member">
      <header className="tdk-member-header">
        <KindIcon kind={member.kind} label={member.label} />
        <h3
          className={cx(
            "tdk-member-name",
            member.deprecated && "tdk-deprecated",
          )}
        >
          {member.name}
        </h3>
        {member.anchor && (
          <a
            href={`#${member.anchor}`}
            className="tdk-anchor"
            aria-label={`Copy link to ${member.name}`}
            title="Copy link"
          >
            #
          </a>
        )}
        <Badges badges={member.badges} />
        <Since version={member.since} />
      </header>

      <Deprecated comment={member.comment} />
      {member.code && <Code block code={member.code} />}
      <Comment comment={member.comment} />

      {member.signatures.map((signature) => (
        <SignatureView key={signature.id} signature={signature} />
      ))}

      <NestedMembers members={member.members} />
      <Relations relations={member.relations} />
      {member.signatures.length === 0 && <Sources sources={member.sources} />}
    </article>
  );
}

export function SignatureView({
  signature,
}: {
  readonly signature: ApiSignature;
}) {
  return (
    <div className="tdk-signature">
      <Deprecated comment={signature.comment} />
      <Code block code={signature.code} />
      <Comment comment={signature.comment} />

      {isDocumented(signature.typeParameters) && (
        <ParameterList
          title="Type parameters"
          parameters={signature.typeParameters}
        />
      )}

      {isDocumented(signature.parameters) && (
        <ParameterList title="Parameters" parameters={signature.parameters} />
      )}

      {signature.returns?.html && (
        <div className="tdk-returns">
          <h4 className="tdk-label">
            Returns <Code code={signature.returns.code} />
          </h4>
          <Html html={signature.returns.html} />
        </div>
      )}

      <Sources sources={signature.sources} />
    </div>
  );
}

export function ParameterList({
  title,
  parameters,
}: {
  readonly title: string;
  readonly parameters: readonly (ApiParameter | ApiTypeParameter)[];
}) {
  return (
    <div className="tdk-params">
      <h4 className="tdk-label">{title}</h4>
      <dl>
        {parameters.map((parameter) => (
          <div key={parameter.name} className="tdk-param">
            <dt>
              <Code code={parameter.code} />
            </dt>
            {(parameter.comment ||
              ("members" in parameter && parameter.members.length > 0)) && (
              <dd>
                <Deprecated comment={parameter.comment} />
                <Comment comment={parameter.comment} />
                {"members" in parameter && (
                  <NestedMembers members={parameter.members} />
                )}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Parameter lists repeat what the signature already shows, so they are
 * only worth rendering when at least one entry has documentation.
 */
export function isDocumented(
  parameters: readonly (ApiParameter | ApiTypeParameter)[],
) {
  return parameters.some(
    (parameter) =>
      parameter.comment !== null ||
      ("members" in parameter && parameter.members.length > 0),
  );
}

/** Properties of an object literal type, rendered compactly. */
function NestedMembers({
  members,
}: {
  readonly members: readonly ApiMember[];
}) {
  if (members.length === 0) {
    return null;
  }

  return (
    <ul className="tdk-nested">
      {members.map((member) => (
        <li
          key={member.id}
          id={member.anchor ?? undefined}
          className="tdk-nested-member"
        >
          {member.code ? (
            <Code code={member.code} />
          ) : (
            member.signatures.map((signature) => (
              <Code key={signature.id} code={signature.code} />
            ))
          )}
          <Badges
            badges={member.badges.filter((badge) => badge === "deprecated")}
          />
          <Comment comment={member.comment} />
          {member.signatures.map((signature) => (
            <Comment key={signature.id} comment={signature.comment} />
          ))}
          <NestedMembers members={member.members} />
        </li>
      ))}
    </ul>
  );
}

function Relations({
  relations,
}: {
  readonly relations: readonly ApiRelation[];
}) {
  if (relations.length === 0) {
    return null;
  }

  return (
    <p className="tdk-relations">
      {relations.map((relation) => (
        <span key={relation.label}>
          {relation.label}{" "}
          {relation.href ? (
            <Link href={relation.href} prefetch={false}>
              <code>{relation.name}</code>
            </Link>
          ) : (
            <code>{relation.name}</code>
          )}
        </span>
      ))}
    </p>
  );
}

export function Sources({
  sources,
}: {
  readonly sources: readonly ApiSource[];
}) {
  if (!config.features.sourceLinks || sources.length === 0) {
    return null;
  }

  return (
    <p className="tdk-source">
      Defined in{" "}
      {sources.map((source, index) => {
        const label = `${source.path}:${source.line}`;

        return (
          <span key={label}>
            {index > 0 && ", "}
            {source.url ? (
              <a href={source.url} target="_blank" rel="noreferrer">
                {label}
              </a>
            ) : (
              label
            )}
          </span>
        );
      })}
    </p>
  );
}
