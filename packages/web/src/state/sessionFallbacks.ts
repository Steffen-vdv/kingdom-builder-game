import { GAME_START, PHASES, RULES } from '@kingdom-builder/contents';
import type {
	PhaseConfig,
	RuleSet,
	StartConfig,
} from '@kingdom-builder/protocol';
import { cloneValue } from './sessionDerivation';

export const getDefaultStartConfig = (): StartConfig => cloneValue(GAME_START);
export const getDefaultPhases = (): PhaseConfig[] => cloneValue(PHASES);
export const getDefaultRuleSet = (): RuleSet => cloneValue(RULES);
