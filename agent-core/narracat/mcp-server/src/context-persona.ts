import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { PersonaCard } from "./persona-loader.js";
import { resolvePackPools, resetPackResolverCache, type PersonaPoolEntry } from "./packs/pack-resolver.js";

export interface PersonaSource {
  card_id: string;
  pack_id: string;
  pack_version: string;
  origin: "official" | "user" | "community";
  body_sha256?: string;
}

export interface ContextPersona {
  body: string;
  changed: boolean;
  sourceModifiedAt?: number;
}

function bodyHash(body: string): string {
  return createHash("sha256").update(body.trim()).digest("hex");
}

export function createPersonaSource(card: PersonaCard, pool: PersonaPoolEntry[]): PersonaSource | undefined {
  const source = pool.find((entry) => entry.id === card.id && readFileSync(entry.path, "utf8").trim() === card.body);
  if (!source) return undefined;
  return {
    card_id: source.id, pack_id: source.source_pack_id,
    pack_version: source.source_pack_version, origin: source.origin,
    body_sha256: bodyHash(card.body),
  };
}

function parseSource(value: unknown): PersonaSource {
  if (!value || typeof value !== "object") throw new Error("声音卡来源无效，请重新生成本章上下文。");
  const source = value as Record<string, unknown>;
  if (!["card_id", "pack_id", "pack_version"].every((key) => typeof source[key] === "string" && source[key])
    || !["official", "user", "community"].includes(String(source.origin))
    || (source.body_sha256 !== undefined && (typeof source.body_sha256 !== "string" || !/^[a-f0-9]{64}$/.test(source.body_sha256)))) {
    throw new Error("声音卡来源无效，请重新生成本章上下文。");
  }
  return source as unknown as PersonaSource;
}

function readLegacySource(projectRoot: string, chapter: number): PersonaSource | undefined {
  let receipt: { chapter?: unknown; entries?: unknown };
  try {
    receipt = JSON.parse(readFileSync(join(projectRoot, ".narracat/capability-receipts", `ch-${String(chapter).padStart(3, "0")}.json`), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw new Error("声音卡来源回执无法读取，请重新生成本章上下文。", { cause: error });
  }
  if (receipt?.chapter !== chapter || !Array.isArray(receipt.entries)) throw new Error("声音卡来源回执无效，请重新生成本章上下文。");
  const entries = receipt.entries.filter((entry) => entry?.type === "persona");
  if (entries.length > 1) throw new Error("声音卡来源不唯一，请重新生成本章上下文。");
  return entries.length ? parseSource(entries[0]) : undefined;
}

export function resolveContextPersona(input: {
  projectRoot: string;
  chapter: number;
  pack: Record<string, unknown>;
  userPacksDir?: string;
  builtinPacksDir?: string;
}): ContextPersona {
  const snapshot = typeof input.pack.persona === "string" ? input.pack.persona : "";
  // An omitted card can be intentional, for example the chapter emotion gate.
  if (!snapshot.trim()) return { body: snapshot, changed: false };
  const source = input.pack.persona_source === undefined
    ? readLegacySource(input.projectRoot, input.chapter)
    : parseSource(input.pack.persona_source);
  if (!source || (source.body_sha256 && source.body_sha256 !== bodyHash(snapshot))) {
    return { body: snapshot, changed: false };
  }
  // Pack enablement and installed manifests can change between reads.
  resetPackResolverCache();
  const pool = resolvePackPools(input.projectRoot, { userPacksDir: input.userPacksDir, builtinPacksDir: input.builtinPacksDir });
  const matches = pool.personas.filter((entry) => entry.id === source.card_id
    && entry.source_pack_id === source.pack_id && entry.origin === source.origin
    && (source.origin === "official" || entry.source_pack_version === source.pack_version));
  if (matches.length !== 1) throw new Error("声音卡源文件不可用，请检查已启用的能力包或重新生成本章上下文。");
  try {
    const body = readFileSync(matches[0].path, "utf8").trim();
    if (!body) throw new Error("Empty voice card");
    return { body, changed: body !== snapshot.trim(), sourceModifiedAt: statSync(matches[0].path).mtimeMs };
  } catch (error) {
    throw new Error("声音卡源文件无法读取，请检查能力包或重新生成本章上下文。", { cause: error });
  }
}
