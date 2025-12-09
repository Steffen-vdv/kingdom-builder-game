import { PhaseStepId } from './phaseTypes';

// ═══════════════════════════════════════════════════════════════════════════
// TRIGGER IDS
// Use these constants throughout content definitions.
// ═══════════════════════════════════════════════════════════════════════════

export const Trigger = {
	// ─────────────────────────────────────────────────────────────────────────
	// Step triggers
	// Fire during a specific step within a phase. Content can hook into these
	// to run effects at that point in the game flow.
	// ─────────────────────────────────────────────────────────────────────────
	GAIN_INCOME: 'onGainIncomeStep',
	PAY_UPKEEP: 'onPayUpkeepStep',
	GAIN_AP: 'onGainAPStep',

	// ─────────────────────────────────────────────────────────────────────────
	// Event triggers
	// Fire in response to game events (not tied to phase flow).
	// ─────────────────────────────────────────────────────────────────────────
	BUILD: 'onBuild',
	BEFORE_ATTACKED: 'onBeforeAttacked',
	ATTACK_RESOLVED: 'onAttackResolved',
} as const;

export type TriggerId = (typeof Trigger)[keyof typeof Trigger];

// ═══════════════════════════════════════════════════════════════════════════
// TRIGGER METADATA
// All triggers must have an entry here. Validation will fail otherwise.
//
// Step triggers: Web derives phase icon/label from stepId by walking
//                phase definitions. Display: "On your <Phase> Phase"
//
// Event triggers: Use provided icon and text directly.
//                 Display: "<icon> <text>"
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Step trigger metadata.
 * Web looks up stepId in phase definitions to find parent phase,
 * then displays: "On your <phase icon> <Phase Label> Phase"
 */
type StepTriggerMeta = {
	type: 'step';
	stepId: (typeof PhaseStepId)[keyof typeof PhaseStepId];
	label: string;
};

/**
 * Event trigger metadata.
 * Web displays: "<icon> <text>"
 */
type EventTriggerMeta = {
	type: 'event';
	icon: string;
	text: string;
	label: string;
};

export type TriggerMeta = StepTriggerMeta | EventTriggerMeta;

export const TRIGGER_META: Record<TriggerId, TriggerMeta> = {
	// ─────────────────────────────────────────────────────────────────────────
	// Step triggers
	// Web shows: "On your <phase icon> <Phase Label> Phase"
	// ─────────────────────────────────────────────────────────────────────────
	[Trigger.GAIN_INCOME]: {
		type: 'step',
		stepId: PhaseStepId.GainIncome,
		label: 'Income',
	},
	[Trigger.PAY_UPKEEP]: {
		type: 'step',
		stepId: PhaseStepId.PayUpkeep,
		label: 'Upkeep',
	},
	[Trigger.GAIN_AP]: {
		type: 'step',
		stepId: PhaseStepId.GainActionPoints,
		label: 'AP',
	},

	// ─────────────────────────────────────────────────────────────────────────
	// Event triggers
	// Web shows: "<icon> <text>"
	// ─────────────────────────────────────────────────────────────────────────
	[Trigger.BUILD]: {
		type: 'event',
		icon: '⚒️',
		text: 'On build',
		label: 'Build',
	},
	[Trigger.BEFORE_ATTACKED]: {
		type: 'event',
		icon: '⚔️',
		text: 'Before being attacked',
		label: 'Before attack',
	},
	[Trigger.ATTACK_RESOLVED]: {
		type: 'event',
		icon: '⚔️',
		text: 'After having been attacked',
		label: 'After attack',
	},
};

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION
// Ensures every Trigger constant has metadata defined.
// ═══════════════════════════════════════════════════════════════════════════

const allTriggerIds = Object.values(Trigger);
const metaKeys = Object.keys(TRIGGER_META);

for (const triggerId of allTriggerIds) {
	if (!metaKeys.includes(triggerId)) {
		throw new Error(`Trigger "${triggerId}" missing from TRIGGER_META. ` + `All triggers must have metadata defined.`);
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY EXPORTS
// TODO: Remove after migrating all usages to Trigger enum
// ═══════════════════════════════════════════════════════════════════════════

/** @deprecated Use Trigger.GAIN_INCOME instead */
export const ON_GAIN_INCOME_STEP = Trigger.GAIN_INCOME;
/** @deprecated Use Trigger.PAY_UPKEEP instead */
export const ON_PAY_UPKEEP_STEP = Trigger.PAY_UPKEEP;
/** @deprecated Use Trigger.GAIN_AP instead */
export const ON_GAIN_AP_STEP = Trigger.GAIN_AP;
