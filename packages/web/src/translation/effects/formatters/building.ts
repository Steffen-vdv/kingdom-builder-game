import { registerEffectFormatter } from '../factory';
import { resolveBuildingDisplay } from '../../content/buildingIcons';

registerEffectFormatter('building', 'add', {
	summarize: (eff, ctx) => {
		const id = eff.params?.['id'] as string;
		const { name, icon } = resolveBuildingDisplay(id, ctx);
		return `${icon}${name}`;
	},
	describe: (eff, ctx) => {
		const id = eff.params?.['id'] as string;
		const { name, icon } = resolveBuildingDisplay(id, ctx);
		return `Construct ${icon}${name}`;
	},
});
