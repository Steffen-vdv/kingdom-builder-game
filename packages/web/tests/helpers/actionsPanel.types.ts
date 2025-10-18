import type { PopulationConfig } from '@kingdom-builder/protocol';
import type { createActionsPanelGame } from './actionsPanel';

export interface ActionsPanelGameOptions {
	populationRoles?: Array<Partial<PopulationConfig>>;
	showBuilding?: boolean;
	actionCategories?: {
		population?: string;
		basic?: string;
		building?: string;
	};
	requirementBuilder?: (context: {
		capacityStat: string;
		populationPlaceholder: string;
	}) => unknown[];
	resourceKeys?: {
		actionCost?: string;
		upkeep?: string;
	};
	statKeys?: {
		capacity?: string;
	};
	placeholders?: {
		population?: string;
	};
	activePlayerAiControlled?: boolean;
	opponentAiControlled?: boolean;
}

export type ActionsPanelTestHarness = ReturnType<typeof createActionsPanelGame>;
