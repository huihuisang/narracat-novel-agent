import type { PersonaCard } from "./persona-loader.js";
import { type PersonaPoolEntry } from "./packs/pack-resolver.js";
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
export declare function createPersonaSource(card: PersonaCard, pool: PersonaPoolEntry[]): PersonaSource | undefined;
export declare function resolveContextPersona(input: {
    projectRoot: string;
    chapter: number;
    pack: Record<string, unknown>;
    userPacksDir?: string;
    builtinPacksDir?: string;
}): ContextPersona;
