import { createTranslationDiffContext } from '../../src/translation/log';
import { type TranslationDiffContext } from '../../src/translation/log/resourceSources/context';
import type { SessionResourceDefinition } from '@kingdom-builder/protocol/session';

type ResourceLike = Partial<Omit<SessionResourceDefinition, 'key'>>;

type EngineDiffSource = Pick<
	TranslationDiffContext,
	'activePlayer' | 'buildings' | 'developments' | 'populations'
> & { passives: unknown };

export function createSessionResourceDefinitions(
	definitions: Record<string, ResourceLike | SessionResourceDefinition>,
): Record<string, SessionResourceDefinition> {
	return Object.fromEntries(
		Object.entries(definitions).map(([key, value]) => {
			if ('key' in value) {
				return [key, { ...value }];
			}
			const definition: SessionResourceDefinition = { key };
			if (value.icon !== undefined) {
				definition.icon = value.icon;
			}
			if (value.label !== undefined) {
				definition.label = value.label;
			}
			if (value.description !== undefined) {
				definition.description = value.description;
			}
			if (value.tags) {
				definition.tags = [...value.tags];
			}
			return [key, definition];
		}),
	);
}

export function createEngineTranslationDiffContext(
	source: EngineDiffSource,
	resources: Record<string, SessionResourceDefinition>,
): TranslationDiffContext {
	return createTranslationDiffContext({
		activePlayer: source.activePlayer,
		buildings: source.buildings,
		developments: source.developments,
		populations: source.populations,
		passives: source.passives,
		resources,
	});
}
