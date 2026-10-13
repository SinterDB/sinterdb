/** Something with a name. */
export interface Thing {
  /** The name. */
  name: string;
}

/** Makes a {@link Thing}. */
export function make(name: string): Thing {
  return { name };
}
