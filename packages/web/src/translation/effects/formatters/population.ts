import { registerEffectFormatter } from '../factory';
import { resolvePopulationDisplay } from '../helpers';

registerEffectFormatter('population', 'add', {
	summarize: (effect, context) => {
		const rawRole = effect.params?.['role'];
		const role = typeof rawRole === 'string' ? rawRole : undefined;
		const poolDisplay = resolvePopulationDisplay(context, undefined);
		const roleDisplay = resolvePopulationDisplay(context, role);
		const poolIcon = poolDisplay.icon || poolDisplay.label || '👥';
		const roleIcon = roleDisplay.icon || roleDisplay.label || role || poolIcon;
		return `${poolIcon}(${roleIcon}) +1`;
	},
	describe: (effect, context) => {
		const rawRole = effect.params?.['role'];
		const role = typeof rawRole === 'string' ? rawRole : undefined;
		const { icon, label } = resolvePopulationDisplay(context, role);
		const resolvedIcon = icon || label || role || '';
		const resolvedLabel = label || role || 'Population';
		return `Add ${resolvedIcon} ${resolvedLabel}`.trim();
	},
	log: (effect, context) => {
		const rawRole = effect.params?.['role'];
		const role = typeof rawRole === 'string' ? rawRole : undefined;
		const { icon, label } = resolvePopulationDisplay(context, role);
		const resolvedIcon = icon || label || role || '';
		const resolvedLabel = label || role || 'Population';
		return `Added ${resolvedIcon} ${resolvedLabel}`.trim();
	},
});

registerEffectFormatter('population', 'remove', {
	summarize: (effect, context) => {
		const rawRole = effect.params?.['role'];
		const role = typeof rawRole === 'string' ? rawRole : undefined;
		const poolDisplay = resolvePopulationDisplay(context, undefined);
		const roleDisplay = resolvePopulationDisplay(context, role);
		const poolIcon = poolDisplay.icon || poolDisplay.label || '👥';
		const roleIcon = roleDisplay.icon || roleDisplay.label || role || poolIcon;
		return `${poolIcon}(${roleIcon}) -1`;
	},
	describe: (effect, context) => {
		const rawRole = effect.params?.['role'];
		const role = typeof rawRole === 'string' ? rawRole : undefined;
		const { icon, label } = resolvePopulationDisplay(context, role);
		const resolvedIcon = icon || label || role || '';
		const resolvedLabel = label || role || 'Population';
		return `Remove ${resolvedIcon} ${resolvedLabel}`.trim();
	},
	log: (effect, context) => {
		const rawRole = effect.params?.['role'];
		const role = typeof rawRole === 'string' ? rawRole : undefined;
		const { icon, label } = resolvePopulationDisplay(context, role);
		const resolvedIcon = icon || label || role || '';
		const resolvedLabel = label || role || 'Population';
		return `Removed ${resolvedIcon} ${resolvedLabel}`.trim();
	},
});
