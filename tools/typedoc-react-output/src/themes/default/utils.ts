export function cx(
  ...classNames: readonly (string | false | null | undefined)[]
) {
  return classNames.filter(Boolean).join(" ");
}
