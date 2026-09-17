import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import {
  cacheClientToolResult,
  getCachedClientToolResult,
  evictClientToolResults,
  clearCachedToolResults,
  cachedToolResultCount,
  setToolResultCacheStorage,
  resetToolResultCacheStorage,
  CACHE_LIMITS,
  ANONYMOUS_SCOPE,
  type StorageLike,
} from "../clientToolResultCache";

/**
 * The durable client-side tool-result cache.
 *
 * This is what makes replay a *replay* rather than a re-run. A client tool executes
 * in the browser, so between execution and the server acknowledging the completion
 * the result exists only in this tab; the cache is what survives a dropped
 * connection so the outcome can be re-reported without executing the macro again.
 *
 * Two things are being asserted throughout: that it actually retains results, and
 * that it can never be the reason anything else fails. The second matters as much
 * as the first — it is an optimisation of a recovery path, not a dependency.
 */
describe("clientToolResultCache", () => {
  /** A record-backed storage so each test is isolated and quota can be simulated. */
  const makeStorage = (options: { failWrites?: boolean } = {}): StorageLike & { data: Map<string, string> } => {
    const data = new Map<string, string>();
    return {
      data,
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (options.failWrites) throw new Error("QuotaExceededError");
        data.set(key, value);
      },
      removeItem: (key: string) => {
        data.delete(key);
      },
    };
  };

  const storageAs = (options: { failWrites?: boolean } = {}) => {
    storage = makeStorage(options);
    setToolResultCacheStorage(storage);
    return storage;
  };

  let storage: ReturnType<typeof makeStorage>;

  const USER = 'user-a';
  const CONV = 'conv-1';

  beforeEach(() => {
    storage = makeStorage();
    setToolResultCacheStorage(storage);
  });

  afterEach(() => {
    resetToolResultCacheStorage();
  });

  describe("store and retrieve", () => {
    it("returns a stored result", () => {
      cacheClientToolResult(USER, "conv-1", {
        toolCallId: "call_1",
        toolName: "chart",
        result: '{"type":"bar"}',
      });

      const found = getCachedClientToolResult(USER, "conv-1", "call_1");
      expect(found).not.toBeNull();
      expect(found!.toolName).toBe("chart");
      expect(found!.result).toBe('{"type":"bar"}');
    });

    it("preserves the whole report envelope, not just the payload", () => {
      // Replay must reproduce exactly what the original report would have carried,
      // so error flags and approval decisions have to survive the round trip.
      cacheClientToolResult(USER, "conv-1", {
        toolCallId: "call_1",
        toolName: "chart",
        isError: true,
        error: "boom",
      });

      const found = getCachedClientToolResult(USER, "conv-1", "call_1")!;
      expect(found.isError).toBe(true);
      expect(found.error).toBe("boom");
    });

    it("preserves a user approval decision", () => {
      // A declined tool never produced output; replaying the *decision* is the
      // correct recovery, not re-running the tool.
      cacheClientToolResult(USER, "conv-1", {
        toolCallId: "call_1",
        toolName: "shell",
        decision: "declined",
      });

      const found = getCachedClientToolResult(USER, "conv-1", "call_1")!;
      expect(found.decision).toBe("declined");
    });

    it("keeps conversations separate", () => {
      cacheClientToolResult(USER, "conv-1", { toolCallId: "call_1", toolName: "chart", result: "a" });
      cacheClientToolResult(USER, "conv-2", { toolCallId: "call_1", toolName: "chart", result: "b" });

      expect(getCachedClientToolResult(USER, "conv-1", "call_1")!.result).toBe("a");
      expect(getCachedClientToolResult(USER, "conv-2", "call_1")!.result).toBe("b");
    });

    it("returns null for an unknown call", () => {
      cacheClientToolResult(USER, "conv-1", { toolCallId: "call_1", toolName: "chart" });
      expect(getCachedClientToolResult(USER, "conv-1", "call_2")).toBeNull();
    });

    it("returns null for an unknown conversation", () => {
      expect(getCachedClientToolResult(USER, "conv-unknown", "call_1")).toBeNull();
    });

    it("replaces rather than duplicates a re-reported call", () => {
      cacheClientToolResult(USER, "conv-1", { toolCallId: "call_1", toolName: "chart", result: "first" });
      cacheClientToolResult(USER, "conv-1", { toolCallId: "call_1", toolName: "chart", result: "second" });

      expect(cachedToolResultCount(USER, "conv-1")).toBe(1);
      expect(getCachedClientToolResult(USER, "conv-1", "call_1")!.result).toBe("second");
    });

    it("stamps cachedAt when the caller does not supply one", () => {
      cacheClientToolResult(USER, "conv-1", { toolCallId: "call_1", toolName: "chart" });
      const found = getCachedClientToolResult(USER, "conv-1", "call_1")!;
      expect(typeof found.cachedAt).toBe("number");
      expect(found.cachedAt).toBeGreaterThan(0);
    });

    it("ignores a write with no conversation or tool call id", () => {
      expect(cacheClientToolResult(USER, "", { toolCallId: "call_1", toolName: "chart" })).toBeNull();
      expect(cacheClientToolResult(USER, "conv-1", { toolCallId: "", toolName: "chart" })).toBeNull();
    });
  });

  describe("scoping — one account must not read another's results", () => {
    it("does not expose a result across users", () => {
      // `localStorage` is per-origin, not per-account. Without the scope, a shared
      // browser profile that switches users would hand the next account the previous
      // account's tool output.
      cacheClientToolResult("user-a", "conv-1", {
        toolCallId: "call_1",
        toolName: "chart",
        result: "alice-output",
      });

      expect(getCachedClientToolResult("user-b", "conv-1", "call_1")).toBeNull();
      expect(getCachedClientToolResult("user-a", "conv-1", "call_1")!.result).toBe("alice-output");
    });

    it("lets two users hold the same conversation and call ids independently", () => {
      cacheClientToolResult("user-a", "conv-1", { toolCallId: "call_1", toolName: "chart", result: "a" });
      cacheClientToolResult("user-b", "conv-1", { toolCallId: "call_1", toolName: "chart", result: "b" });

      expect(getCachedClientToolResult("user-a", "conv-1", "call_1")!.result).toBe("a");
      expect(getCachedClientToolResult("user-b", "conv-1", "call_1")!.result).toBe("b");
    });

    it("does not let one user evict another user's entry", () => {
      cacheClientToolResult("user-a", "conv-1", { toolCallId: "call_1", toolName: "chart" });

      evictClientToolResults("user-b", "conv-1", ["call_1"]);

      expect(getCachedClientToolResult("user-a", "conv-1", "call_1")).not.toBeNull();
    });

    it("does not let one user clear another user's conversation", () => {
      cacheClientToolResult("user-a", "conv-1", { toolCallId: "call_1", toolName: "chart" });

      clearCachedToolResults("user-b", "conv-1");

      expect(cachedToolResultCount("user-a", "conv-1")).toBe(1);
    });

    it("counts per scope", () => {
      cacheClientToolResult("user-a", "conv-1", { toolCallId: "call_1", toolName: "chart" });
      expect(cachedToolResultCount("user-b", "conv-1")).toBe(0);
      expect(cachedToolResultCount("user-a", "conv-1")).toBe(1);
    });

    it("keeps conversation eviction within the scope that overflowed", () => {
      // A user with many conversations must not evict a different user's cache.
      for (let i = 0; i < CACHE_LIMITS.MAX_CONVERSATIONS + 2; i += 1) {
        cacheClientToolResult("user-a", `conv-${i}`, {
          toolCallId: "call_1",
          toolName: "chart",
          cachedAt: i,
        });
      }
      cacheClientToolResult("user-b", "conv-b", { toolCallId: "call_1", toolName: "chart" });

      expect(getCachedClientToolResult("user-b", "conv-b", "call_1")).not.toBeNull();
    });

    it("falls back to a single anonymous namespace for a blank scope", () => {
      // A blank scope must not collide with a named user's namespace, and must not
      // produce a key with an empty segment that unrelated callers would share by
      // accident. Two blanks land in the same anonymous scope, which is correct —
      // there is no identity to separate them by.
      cacheClientToolResult("", "conv-1", { toolCallId: "call_1", toolName: "chart", result: "anon" });
      cacheClientToolResult("user-a", "conv-1", { toolCallId: "call_1", toolName: "chart", result: "named" });

      expect(getCachedClientToolResult(ANONYMOUS_SCOPE, "conv-1", "call_1")!.result).toBe("anon");
      expect(getCachedClientToolResult("user-a", "conv-1", "call_1")!.result).toBe("named");
      expect(getCachedClientToolResult("   ", "conv-1", "call_1")!.result).toBe("anon");
    });
  });

  describe("eviction on acknowledgement", () => {
    it("drops the named results", () => {
      cacheClientToolResult(USER, "conv-1", { toolCallId: "call_1", toolName: "chart" });
      cacheClientToolResult(USER, "conv-1", { toolCallId: "call_2", toolName: "d3" });

      evictClientToolResults(USER, "conv-1", ["call_1"]);

      expect(getCachedClientToolResult(USER, "conv-1", "call_1")).toBeNull();
      expect(getCachedClientToolResult(USER, "conv-1", "call_2")).not.toBeNull();
    });

    it("allows a re-cache after eviction", () => {
      // The real sequence: report succeeds, entry evicted; a *later* call for the
      // same id must still be cacheable.
      cacheClientToolResult(USER, "conv-1", { toolCallId: "call_1", toolName: "chart", result: "a" });
      evictClientToolResults(USER, "conv-1", ["call_1"]);
      cacheClientToolResult(USER, "conv-1", { toolCallId: "call_1", toolName: "chart", result: "b" });

      expect(getCachedClientToolResult(USER, "conv-1", "call_1")!.result).toBe("b");
    });

    it("is a no-op for an unknown id", () => {
      cacheClientToolResult(USER, "conv-1", { toolCallId: "call_1", toolName: "chart" });
      evictClientToolResults(USER, "conv-1", ["nope"]);
      expect(cachedToolResultCount(USER, "conv-1")).toBe(1);
    });

    it("tolerates an empty or missing id list", () => {
      cacheClientToolResult(USER, "conv-1", { toolCallId: "call_1", toolName: "chart" });
      evictClientToolResults(USER, "conv-1", []);
      evictClientToolResults(USER, "conv-1", undefined as any);
      expect(cachedToolResultCount(USER, "conv-1")).toBe(1);
    });

    it("clears a conversation entirely", () => {
      cacheClientToolResult(USER, "conv-1", { toolCallId: "call_1", toolName: "chart" });
      clearCachedToolResults(USER, "conv-1");
      expect(getCachedClientToolResult(USER, "conv-1", "call_1")).toBeNull();
      expect(cachedToolResultCount(USER, "conv-1")).toBe(0);
    });
  });

  describe("bounds", () => {
    it("caps entries per conversation, dropping oldest first", () => {
      const limit = CACHE_LIMITS.MAX_ENTRIES_PER_CONVERSATION;
      for (let i = 0; i < limit + 5; i += 1) {
        cacheClientToolResult(USER, "conv-1", {
          toolCallId: `call_${i}`,
          toolName: "chart",
          result: `r${i}`,
          cachedAt: i,
        });
      }

      expect(cachedToolResultCount(USER, "conv-1")).toBeLessThanOrEqual(limit);
      // The newest survive...
      expect(getCachedClientToolResult(USER, "conv-1", `call_${limit + 4}`)).not.toBeNull();
      // ...and the oldest were dropped.
      expect(getCachedClientToolResult(USER, "conv-1", "call_0")).toBeNull();
    });

    it("does not cache an entry larger than the per-entry cap", () => {
      // An oversized payload would consume the whole conversation budget and risk
      // the origin's quota, taking unrelated writes down with it.
      const big = "x".repeat(CACHE_LIMITS.MAX_ENTRY_BYTES + 1);

      const count = cacheClientToolResult(USER, "conv-1", {
        toolCallId: "call_big",
        toolName: "image",
        result: big,
      });

      expect(count).toBeNull();
      expect(getCachedClientToolResult(USER, "conv-1", "call_big")).toBeNull();
    });

    it("accepts an entry just under the per-entry cap", () => {
      const ok = "x".repeat(1024);
      cacheClientToolResult(USER, "conv-1", { toolCallId: "call_ok", toolName: "chart", result: ok });
      expect(getCachedClientToolResult(USER, "conv-1", "call_ok")).not.toBeNull();
    });

    it("evicts whole conversations beyond the cap, oldest touched first", () => {
      for (let i = 0; i < CACHE_LIMITS.MAX_CONVERSATIONS + 3; i += 1) {
        cacheClientToolResult(USER, `conv-${i}`, {
          toolCallId: "call_1",
          toolName: "chart",
          cachedAt: i,
        });
      }

      // The most recently written conversation survives...
      const last = CACHE_LIMITS.MAX_CONVERSATIONS + 2;
      expect(getCachedClientToolResult(USER, `conv-${last}`, "call_1")).not.toBeNull();
      // ...and the first one is gone.
      expect(getCachedClientToolResult(USER, "conv-0", "call_1")).toBeNull();
    });
  });

  describe("degradation — the cache must never break anything", () => {
    it("reports a miss when storage is unavailable", () => {
      setToolResultCacheStorage(null);
      expect(cacheClientToolResult(USER, "conv-1", { toolCallId: "call_1", toolName: "chart" })).toBeNull();
      expect(getCachedClientToolResult(USER, "conv-1", "call_1")).toBeNull();
    });

    it("swallows a quota failure instead of throwing", () => {
      // A full quota must not surface as a failed tool execution or an unsent
      // completion. A miss degrades to the re-run fallback; an exception would
      // break the turn.
      setToolResultCacheStorage(makeStorage({ failWrites: true }));

      expect(() =>
        cacheClientToolResult(USER, "conv-1", { toolCallId: "call_1", toolName: "chart" })
      ).not.toThrow();
      expect(cacheClientToolResult(USER, "conv-1", { toolCallId: "call_1", toolName: "chart" })).toBeNull();
    });

    it("swallows a throwing storage read", () => {
      setToolResultCacheStorage({
        getItem: () => {
          throw new Error("storage disabled");
        },
        setItem: () => {},
        removeItem: () => {},
      });

      expect(getCachedClientToolResult(USER, "conv-1", "call_1")).toBeNull();
    });

    it("treats a corrupt payload as a miss rather than throwing", () => {
      storage.setItem("reactor.toolResults.user-a::conv-1", "{not json");
      expect(getCachedClientToolResult(USER, "conv-1", "call_1")).toBeNull();
      // And can still be written over.
      cacheClientToolResult(USER, "conv-1", { toolCallId: "call_1", toolName: "chart", result: "ok" });
      expect(getCachedClientToolResult(USER, "conv-1", "call_1")!.result).toBe("ok");
    });

    it("treats a payload of the wrong shape as a miss", () => {
      storage.setItem("reactor.toolResults.user-a::conv-1", JSON.stringify({ not: "an array" }));
      expect(getCachedClientToolResult(USER, "conv-1", "call_1")).toBeNull();
    });

    it("skips an unserialisable result without throwing", () => {
      const circular: any = { name: "loop" };
      circular.self = circular;

      expect(() =>
        cacheClientToolResult(USER, "conv-1", { toolCallId: "call_1", toolName: "chart", result: circular })
      ).not.toThrow();
      expect(getCachedClientToolResult(USER, "conv-1", "call_1")).toBeNull();
    });

    it("evict and clear are safe with no storage", () => {
      setToolResultCacheStorage(null);
      expect(() => evictClientToolResults(USER, "conv-1", ["call_1"])).not.toThrow();
      expect(() => clearCachedToolResults(USER, "conv-1")).not.toThrow();
      expect(cachedToolResultCount(USER, "conv-1")).toBe(0);
    });
  });
});
