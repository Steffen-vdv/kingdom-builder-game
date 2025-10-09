import { registerEffectFormatter } from '../factory';
import { resolveBuildingDisplay } from '../../content/buildingIcons';

registerEffectFormatter('building', 'add', {
	summarize: (effect, context) => {
		const id = effect.params?.['id'] as string;
		const { name, icon } = resolveBuildingDisplay(id, context);
		return `${icon}${name}`;
	},
	describe: (effect, context) => {
		const id = effect.params?.['id'] as string;
		const { name, icon } = resolveBuildingDisplay(id, context);
		return `Construct ${icon}${name}`;
	},
});
