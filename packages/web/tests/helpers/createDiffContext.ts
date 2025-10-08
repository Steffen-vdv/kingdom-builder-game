import type { EngineContext, PlayerId } from '@kingdom-builder/engine';
import type {
	TranslationContext,
	TranslationPassiveDescriptor,
} from '../../src/translation/context';
import {
	createTranslationDiffContext,
	snapshotPlayer,
} from '../../src/translation/log';
import { wrapTranslationRegistry } from './translationContextStub';

function toPassiveDescriptor(
	context: EngineContext,
	id: string,
	owner: PlayerId,
): TranslationPassiveDescriptor | undefined {
	const passive = context.passives.list(owner).find((entry) => entry.id === id);
	if (!passive) {
		return undefined;
	}
	const descriptor: TranslationPassiveDescriptor = {};
	if (passive.icon !== undefined) {
		descriptor.icon = passive.icon;
	}
	const sourceIcon = passive.meta?.source?.icon;
	if (sourceIcon !== undefined) {
		descriptor.meta = { source: { icon: sourceIcon } };
	}
	return descriptor;
}

export function createDiffContextFromEngine(
	context: EngineContext,
): ReturnType<typeof createTranslationDiffContext> {
	const active = snapshotPlayer(context.activePlayer, context);
	const translation = {
		buildings: wrapTranslationRegistry(context.buildings),
		developments: wrapTranslationRegistry(context.developments),
		passives: {
			list(owner?: PlayerId) {
				return context.passives.list(owner);
			},
			get(id: string, owner: PlayerId) {
				return toPassiveDescriptor(context, id, owner);
			},
			get evaluationMods() {
				return context.passives.evaluationMods;
			},
		},
	} satisfies Pick<
		TranslationContext,
		'buildings' | 'developments' | 'passives'
	>;
	const players = context.game.players.map((player) => ({
		id: player.id,
		passives: snapshotPlayer(player, context).passives,
	}));
	return createTranslationDiffContext(
		translation,
		context.activePlayer.id,
		active,
		players,
	);
}
