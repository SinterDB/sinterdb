const LETTERS: Record<string, string> = {
  accessor: "A",
  "call-signature": "S",
  class: "C",
  constructor: "C",
  "constructor-signature": "C",
  enum: "E",
  "enum-member": "E",
  function: "F",
  "index-signature": "S",
  interface: "I",
  method: "M",
  module: "M",
  namespace: "N",
  parameter: "P",
  property: "P",
  reference: "R",
  "type-alias": "T",
  "type-literal": "T",
  "type-parameter": "T",
  variable: "V",
};

/**
 * Kind marker in the style of the default TypeDoc theme, drawn with CSS
 * so the output needs no icon assets.
 */
export function KindIcon({
  kind,
  label,
}: {
  readonly kind: string;
  readonly label?: string;
}) {
  return (
    <span
      className="tdk-icon"
      data-kind={kind}
      title={label}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {LETTERS[kind] ?? "·"}
    </span>
  );
}
