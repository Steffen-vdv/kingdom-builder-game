import type { createActionsPanelGame } from './actionsPanel';

interface PopulationRoleOption {
	id?: string;
	name?: string;
	icon?: string;
}

export interface ActionsPanelGameOptions {
	populationRoles?: PopulationRoleOption[];
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
}

export type ActionsPanelTestHarness = ReturnType<typeof createActionsPanelGame>;
