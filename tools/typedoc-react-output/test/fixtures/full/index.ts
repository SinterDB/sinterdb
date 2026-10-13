/**
 * Options for {@link Store.find}.
 *
 * @deprecated Use {@link QueryOptions} instead.
 */
export interface FindOptions {
  /** Maximum number of results. */
  limit?: number;
}

/**
 * Options for {@link Store.query}. Replaces {@link FindOptions}.
 *
 * @since 1.1.0
 */
export interface QueryOptions {
  /** Maximum number of results. */
  limit?: number;
  /** Results to skip. */
  skip?: number;
}

/**
 * Holds things.
 *
 * @since 1.0.0
 */
export class Store {
  /** Finds things. */
  find(options?: FindOptions): string[] {
    return options ? [] : [];
  }

  /**
   * Queries things.
   *
   * @since 1.1.0
   */
  query(options?: QueryOptions): string[] {
    return options ? [] : [];
  }

  /**
   * The old way. See {@link Store.query}.
   *
   * @deprecated Use {@link Store.query}.
   */
  legacy(): void {}
}

/**
 * A store from before {@link Store}.
 *
 * @deprecated Use {@link Store}.
 */
export class OldStore {
  /** Number of items. */
  size = 0;
}
