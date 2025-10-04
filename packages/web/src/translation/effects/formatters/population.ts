import { POPULATION_ROLES, POPULATION_INFO } from '@kingdom-builder/contents';
import { registerEffectFormatter } from '../factory';
import { resolvePopulationDisplay } from '../helpers';

registerEffectFormatter('population', 'add', {
	summarize: (eff) => {
		const role = eff.params?.['role'] as
			| keyof typeof POPULATION_ROLES
			| undefined;
		const icon = role
			? POPULATION_ROLES[role]?.icon || role
			: POPULATION_INFO.icon;
		return `${POPULATION_INFO.icon}(${icon}) +1`;
	},
	describe: (eff) => {
		const role = eff.params?.['role'] as
			| keyof typeof POPULATION_ROLES
			| undefined;
		const { icon, label } = resolvePopulationDisplay(role);
		return `Add ${icon} ${label}`;
	},
	log: (eff) => {
		const role = eff.params?.['role'] as
			| keyof typeof POPULATION_ROLES
			| undefined;
		const { icon, label } = resolvePopulationDisplay(role);
		return `Added ${icon} ${label}`;
	},
});

registerEffectFormatter('population', 'remove', {
	summarize: (eff) => {
		const role = eff.params?.['role'] as
			| keyof typeof POPULATION_ROLES
			| undefined;
		const icon = role
			? POPULATION_ROLES[role]?.icon || role
			: POPULATION_INFO.icon;
		return `${POPULATION_INFO.icon}(${icon}) -1`;
	},
	describe: (eff) => {
		const role = eff.params?.['role'] as
			| keyof typeof POPULATION_ROLES
			| undefined;
		const { icon, label } = resolvePopulationDisplay(role);
		return `Remove ${icon} ${label}`;
	},
	log: (eff) => {
		const role = eff.params?.['role'] as
			| keyof typeof POPULATION_ROLES
			| undefined;
		const { icon, label } = resolvePopulationDisplay(role);
		return `Removed ${icon} ${label}`;
	},
});
