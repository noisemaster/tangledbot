export interface ExpiringStoreOptions {
  maxEntries: number;
  ttlMs: number;
  now?: () => number;
}

interface StoredValue<T> {
  expiresAt: number;
  value: T;
}

/**
 * A small bounded store for temporary Discord interaction state.
 *
 * Entries expire lazily on access and the oldest entries are evicted when the
 * size limit is reached. This avoids one timer per interaction while keeping a
 * long-running bot from retaining every message it has ever created.
 */
export class ExpiringStore<T> {
  readonly #entries = new Map<string, StoredValue<T>>();
  readonly #maxEntries: number;
  readonly #ttlMs: number;
  readonly #now: () => number;

  constructor({ maxEntries, ttlMs, now = Date.now }: ExpiringStoreOptions) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1) {
      throw new Error("maxEntries must be a positive integer");
    }

    if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
      throw new Error("ttlMs must be greater than zero");
    }

    this.#maxEntries = maxEntries;
    this.#ttlMs = ttlMs;
    this.#now = now;
  }

  get size(): number {
    return this.#entries.size;
  }

  get(key: string): T | undefined {
    const entry = this.#entries.get(key);

    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= this.#now()) {
      this.#entries.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: T): void {
    // Refresh insertion order when an existing interaction is updated.
    this.#entries.delete(key);
    this.#entries.set(key, {
      expiresAt: this.#now() + this.#ttlMs,
      value,
    });

    while (this.#entries.size > this.#maxEntries) {
      const oldestKey = this.#entries.keys().next().value;

      if (oldestKey === undefined) {
        break;
      }

      this.#entries.delete(oldestKey);
    }
  }
}
