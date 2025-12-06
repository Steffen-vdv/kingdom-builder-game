import type { ResourceV2Definition } from '../types';
import { resourceV2 } from '../resourceBuilder';

export const STAT_RESOURCE_DEFINITIONS: readonly ResourceV2Definition[] = [
	resourceV2('resource:core:max-population')
		.icon('👥')
		.label('Max Population')
		.description('Max Population determines how many subjects your kingdom can ' + 'sustain. Expand infrastructure or build houses to increase it.')
		.lowerBound(0)
		.boundOf('resource:core:total', 'upper')
		.build(),
	resourceV2('resource:core:army-strength')
		.icon('⚔️')
		.label('Army Strength')
		.description('Army Strength reflects the overall power of your military forces. A higher value makes your attacks more formidable.')
		.lowerBound(0)
		.build(),
	resourceV2('resource:core:fortification-strength')
		.icon('🛡️')
		.label('Fortification Strength')
		.description('Fortification Strength measures the resilience of your defenses. It reduces damage taken when enemies assault your castle.')
		.lowerBound(0)
		.build(),
	resourceV2('resource:core:absorption')
		.icon('🌀')
		.label('Absorption')
		.description('Absorption reduces incoming damage by a percentage. It represents magical barriers or tactical advantages that soften blows.')
		.displayAsPercent()
		.allowDecimal()
		.lowerBound(0)
		.build(),
	resourceV2('resource:core:growth')
		.icon('📈')
		.label('Growth')
		.description(
			'Growth increases Army and Fortification Strength during the Raise Strength step. Its effect scales with active Legions and Fortifiers—if you lack Legions or Fortifiers, that side will not gain Strength during the Growth phase.',
		)
		.displayAsPercent()
		.allowDecimal()
		.lowerBound(0)
		.build(),
	resourceV2('resource:core:war-weariness')
		.icon('💤')
		.label('War Weariness')
		.description('War Weariness reflects the fatigue from prolonged conflict. High weariness can sap morale and hinder wartime efforts.')
		.lowerBound(0)
		.build(),
];
