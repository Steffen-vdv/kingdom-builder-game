import { POPULATION_ROLES, POPULATION_INFO } from '@kingdom-builder/contents';
import { registerEffectFormatter } from '../factory';
import { resolvePopulationDisplay } from '../helpers';

registerEffectFormatter('population', 'add', {
	summarize: (effect) => {
		const role = effect.params?.['role'] as
			| keyof typeof POPULATION_ROLES
			| undefined;
		const icon = role
			? POPULATION_ROLES[role]?.icon || role
			: POPULATION_INFO.icon;
		return `${POPULATION_INFO.icon}(${icon}) +1`;
	},
	describe: (effect) => {
		const role = effect.params?.['role'] as
			| keyof typeof POPULATION_ROLES
			| undefined;
		const { icon, label } = resolvePopulationDisplay(role);
		return `Add ${icon} ${label}`;
	},
	log: (effect) => {
		const role = effect.params?.['role'] as
			| keyof typeof POPULATION_ROLES
			| undefined;
		const { icon, label } = resolvePopulationDisplay(role);
		return `Added ${icon} ${label}`;
	},
});

registerEffectFormatter('population', 'remove', {
	summarize: (effect) => {
		const role = effect.params?.['role'] as
			| keyof typeof POPULATION_ROLES
			| undefined;
		const icon = role
			? POPULATION_ROLES[role]?.icon || role
			: POPULATION_INFO.icon;
		return `${POPULATION_INFO.icon}(${icon}) -1`;
	},
	describe: (effect) => {
		const role = effect.params?.['role'] as
			| keyof typeof POPULATION_ROLES
			| undefined;
		const { icon, label } = resolvePopulationDisplay(role);
		return `Remove ${icon} ${label}`;
	},
	log: (effect) => {
		const role = effect.params?.['role'] as
			| keyof typeof POPULATION_ROLES
			| undefined;
		const { icon, label } = resolvePopulationDisplay(role);
		return `Removed ${icon} ${label}`;
	},
});
