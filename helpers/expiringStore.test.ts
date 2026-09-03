import { describe, expect, test } from "bun:test";
import { ExpiringStore } from "./expiringStore.ts";

describe("ExpiringStore", () => {
  test("removes expired entries", () => {
    let now = 0;
    const store = new ExpiringStore<string>({
      maxEntries: 2,
      ttlMs: 100,
      now: () => now,
    });

    store.set("message", "state");
    expect(store.get("message")).toBe("state");

    now = 100;
    expect(store.get("message")).toBeUndefined();
    expect(store.size).toBe(0);
  });

  test("evicts the oldest entry at the size limit", () => {
    const store = new ExpiringStore<number>({ maxEntries: 2, ttlMs: 1_000 });

    store.set("first", 1);
    store.set("second", 2);
    store.set("third", 3);

    expect(store.get("first")).toBeUndefined();
    expect(store.get("second")).toBe(2);
    expect(store.get("third")).toBe(3);
  });

  test("refreshes an updated entry before evicting", () => {
    const store = new ExpiringStore<number>({ maxEntries: 2, ttlMs: 1_000 });

    store.set("first", 1);
    store.set("second", 2);
    store.set("first", 10);
    store.set("third", 3);

    expect(store.get("first")).toBe(10);
    expect(store.get("second")).toBeUndefined();
  });
});
