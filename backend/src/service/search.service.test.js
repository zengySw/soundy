import test from "node:test";
import assert from "node:assert/strict";
import {
  normalize_search_query,
  resolve_search_limit,
  resolve_search_type,
} from "./search.service.js";

test("normalize_search_query trims and compacts spaces", () => {
  assert.equal(normalize_search_query("   lo   fi   beats   "), "lo fi beats");
});

test("resolve_search_type supports known tabs", () => {
  assert.equal(resolve_search_type("all"), "all");
  assert.equal(resolve_search_type("tracks"), "tracks");
  assert.equal(resolve_search_type("artists"), "artists");
  assert.equal(resolve_search_type("playlists"), "playlists");
});

test("resolve_search_type rejects unknown values", () => {
  assert.throws(() => resolve_search_type("unknown"), /INVALID_SEARCH_TYPE/);
});

test("resolve_search_limit clamps limits to [1, 50]", () => {
  assert.equal(resolve_search_limit("0", 20), 1);
  assert.equal(resolve_search_limit("500", 20), 50);
  assert.equal(resolve_search_limit("15", 20), 15);
});
