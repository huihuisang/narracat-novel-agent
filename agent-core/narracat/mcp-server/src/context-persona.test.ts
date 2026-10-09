import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPersonaSource, resolveContextPersona } from "./context-persona.js";
import { resolvePackPools, resetPackResolverCache } from "./packs/pack-resolver.js";

let root: string;
let projectRoot: string;
let builtinPacksDir: string;
let userPacksDir: string;
beforeEach(() => {
  resetPackResolverCache();
  root = mkdtempSync(join(tmpdir(), "context-persona-"));
  projectRoot = join(root, "novel");
  builtinPacksDir = join(root, "builtin");
  userPacksDir = join(root, "user");
  mkdirSync(join(projectRoot, ".narracat/capability-receipts"), { recursive: true });
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function card(origin = "official", version = "1.0.0", body = "Current voice") {
  const id = origin === "official" ? "official-base" : "my-pack";
  const dir = join(origin === "official" ? builtinPacksDir : userPacksDir, `${id}@${version}`);
  mkdirSync(join(dir, "cards"), { recursive: true });
  writeFileSync(join(dir, "pack.json"), JSON.stringify({
    pack_format_version: 1, id, name: "Voice", author: "Tester", version,
    cards: [{ type: "persona", id: "voice", name: "Voice", path: "cards/voice.md", keywords: ["voice"] }],
  }));
  const file = join(dir, "cards/voice.md");
  writeFileSync(file, body);
  return file;
}
function receipt(origin = "official", version = "0.9.0") {
  return { card_id: "voice", type: "persona", pack_id: origin === "official" ? "official-base" : "my-pack", pack_version: version, origin, consumer: "chapter-writer", reason: "Voice match" };
}
function resolve(pack: Record<string, unknown>) {
  return resolveContextPersona({ projectRoot, chapter: 3, pack, builtinPacksDir, userPacksDir });
}
function writeReceipt(entries: unknown[]) {
  writeFileSync(join(projectRoot, ".narracat/capability-receipts/ch-003.json"), JSON.stringify({ chapter: 3, entries }));
}

describe("live context persona", () => {
  it("reads the current official source through a legacy receipt on each call", () => {
    const file = card();
    writeReceipt([receipt()]);
    const pack = { persona: "Old voice", chapter_outline: "Plot" };
    expect(resolve(pack)).toMatchObject({ body: "Current voice", changed: true });
    writeFileSync(file, "Revised voice");
    expect(resolve(pack).body).toBe("Revised voice");
    expect(pack.persona).toBe("Old voice");
  });
  it("respects the locked user version and updates its own source", () => {
    const file = card("user", "1.0.0", "Custom voice");
    card("user", "2.0.0", "Other version");
    writeFileSync(join(projectRoot, ".narracat/packs.json"), JSON.stringify({ enabled: [{ id: "my-pack", version: "1.0.0" }] }));
    writeReceipt([receipt("user", "1.0.0")]);
    expect(resolve({ persona: "Old custom voice" }).body).toBe("Custom voice");
    writeFileSync(file, "Edited custom voice");
    expect(resolve({ persona: "Old custom voice" }).body).toBe("Edited custom voice");
  });
  it("does not restore a card omitted by chapter selection", () => {
    card();
    writeReceipt([receipt()]);
    expect(resolve({ chapter_outline: "Serious scene" }).body).toBe("");
  });
  it("preserves inline cards without provenance", () => {
    card();
    expect(resolve({ persona: "Inline custom voice" })).toEqual({ body: "Inline custom voice", changed: false });
  });
  it("rejects unavailable or disabled known sources instead of using stale text", () => {
    const file = card();
    writeReceipt([receipt()]);
    rmSync(file);
    expect(() => resolve({ persona: "Old voice" })).toThrow("声音卡源文件");
    writeFileSync(file, "Current voice");
    writeFileSync(join(projectRoot, ".narracat/packs.json"), JSON.stringify({ enabled: [] }));
    expect(() => resolve({ persona: "Old voice" })).toThrow("声音卡源文件");
  });
  it("stores source identity and keeps an explicit inline edit", () => {
    const file = card();
    const pool = resolvePackPools(projectRoot, { builtinPacksDir, userPacksDir });
    const source = createPersonaSource({ id: "voice", name: "Voice", body: "Current voice" }, pool.personas);
    expect(source).toMatchObject({ card_id: "voice", pack_id: "official-base", origin: "official" });
    expect(JSON.stringify(source)).not.toContain(file);
    writeFileSync(file, "Updated source");
    expect(resolve({ persona: "Current voice", persona_source: source }).body).toBe("Updated source");
    expect(resolve({ persona: "Author inline edit", persona_source: source }).body).toBe("Author inline edit");
  });
  it("does not guess when a receipt has conflicting persona entries", () => {
    card();
    writeReceipt([receipt(), receipt("user", "1.0.0")]);
    expect(() => resolve({ persona: "Old voice" })).toThrow("声音卡来源");
  });
  it("rejects malformed provenance and ignores receipt paths supplied by data", () => {
    card();
    writeReceipt([receipt()]);
    expect(() => resolve({ persona: "Old voice", persona_source: { path: "/etc/passwd" } })).toThrow("声音卡来源");
    const path = join(projectRoot, ".narracat/capability-receipts/ch-003.json");
    const saved = readFileSync(path, "utf8");
    resolve({ persona: "Old voice" });
    expect(readFileSync(path, "utf8")).toBe(saved);
  });
});
