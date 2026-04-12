/**
 * Byte-Sized Empire — Research Tree
 *
 * Aggregates all 36 research actions across three tiers.
 * Individual tier files keep each under the 400-line limit.
 */
import type { ActionConfig } from '@kingdom-builder/protocol';
import { t1Research } from './research-t1';
import { t2Research } from './research-t2';
import { t3Research } from './research-t3';

export type ResearchEntry = { id: string; def: ActionConfig };

export function allResearch(): ResearchEntry[] {
	return [...t1Research(), ...t2Research(), ...t3Research()];
}

export { ResearchT1, ResearchT2, ResearchT3, ResearchId, RESEARCH_T1_IDS, RESEARCH_T2_IDS, RESEARCH_T3_IDS, ALL_RESEARCH_IDS } from './researchIds';
export type { ResearchT1 as ResearchT1Id, ResearchT2 as ResearchT2Id, ResearchT3 as ResearchT3Id, ResearchId as ResearchIdValue } from './researchIds';
