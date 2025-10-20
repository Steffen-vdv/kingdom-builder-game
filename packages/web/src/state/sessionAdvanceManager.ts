import type { SessionAdvanceResult } from '@kingdom-builder/protocol/session';
import { cloneValue } from './cloneValue';
import type { SessionStateRecord } from './sessionStateStore';

interface SessionAdvanceManagerDependencies {
	getSessionRecord: () => SessionStateRecord | undefined;
}

export class SessionAdvanceManager {
	#sessionId: string;
	#dependencies: SessionAdvanceManagerDependencies;
	#latestAdvance: SessionAdvanceResult | null;

	constructor(
		sessionId: string,
		dependencies: SessionAdvanceManagerDependencies,
	) {
		this.#sessionId = sessionId;
		this.#dependencies = dependencies;
		this.#latestAdvance = null;
	}

	recordAdvanceResult(result: SessionAdvanceResult): void {
		this.#latestAdvance = cloneValue(result);
	}

	syncPlayerName(playerId: string, name: string): void {
		if (!this.#latestAdvance) {
			return;
		}
		const { player } = this.#latestAdvance;
		if (player.id !== playerId || player.name === name) {
			return;
		}
		this.#latestAdvance = {
			...this.#latestAdvance,
			player: { ...player, name },
		} satisfies SessionAdvanceResult;
	}

	advancePhase(): SessionAdvanceResult {
		if (this.#latestAdvance) {
			const result = cloneValue(this.#latestAdvance);
			this.#latestAdvance = null;
			return result;
		}
		const record = this.#dependencies.getSessionRecord();
		if (!record) {
			const message = [
				'Unable to infer advance result for',
				this.#sessionId,
			].join(' ');
			throw new Error(`${message}.`);
		}
		const { snapshot } = record;
		const active = snapshot.game.players.find(
			(player) => player.id === snapshot.game.activePlayerId,
		);
		if (!active) {
			const message = [
				'Unable to infer advance result for',
				this.#sessionId,
			].join(' ');
			throw new Error(`${message}.`);
		}
		return {
			phase: snapshot.game.currentPhase,
			step: snapshot.game.currentStep,
			effects: [],
			player: active,
		};
	}
}
