import type { ResourceDefinition } from '../types';
import { resource } from '../resourceBuilder';

export const CORE_RESOURCE_DEFINITIONS: readonly ResourceDefinition[] = [
	resource('resource:core:gold')
		.icon('🪙')
		.label('Gold')
		.description(
			'Gold is the foundational currency of the realm. It is earned through developments and actions and spent to fund buildings, recruit population or pay for powerful plays. A healthy treasury keeps your options open.',
		)
		.tags('bankruptcy-check')
		.lowerBound(0)
		.build(),
	resource('resource:core:action-points')
		.icon('⚡')
		.label('Action Points')
		.description('Action Points govern how many actions you can perform during your turn. Plan carefully: once you run out of AP, your main phase ends.')
		.lowerBound(0)
		.globalActionCost(1)
		.build(),
	resource('resource:core:castle-hp')
		.icon('🏰')
		.label('Castle HP')
		.description('Castle HP represents the durability of your stronghold. If it ever drops to zero, your kingdom falls and the game is lost.')
		.tags('attack-target', 'win-condition-zero')
		.lowerBound(0)
		.build(),
];
