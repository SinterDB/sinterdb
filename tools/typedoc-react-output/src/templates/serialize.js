export function serialize(value) {
  return JSON.stringify(value, null, 2);
}

/** `../` for every segment of a route, e.g. `../../` for `classes/Foo`. */
export function relativePrefix(route) {
  return "../".repeat(route.split("/").filter(Boolean).length);
}
