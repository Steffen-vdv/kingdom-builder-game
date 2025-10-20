import type { GameEngineContextValue } from './GameContext.types';

const NOOP = () => {};

export interface GameplayPreferenceOptions {
	autoAcknowledgeEnabled?: boolean;
	onToggleAutoAcknowledge?: () => void;
	autoPassEnabled?: boolean;
	onToggleAutoPass?: () => void;
	autoAcknowledgeResolutions?: boolean;
	onToggleAutoAcknowledgeResolutions?: () => void;
	autoPassTurn?: boolean;
	onToggleAutoPassTurn?: () => void;
}

export const createGameplayPreferenceContext = ({
	autoAcknowledgeEnabled,
	onToggleAutoAcknowledge,
	autoPassEnabled,
	onToggleAutoPass,
	autoAcknowledgeResolutions,
	onToggleAutoAcknowledgeResolutions,
	autoPassTurn,
	onToggleAutoPassTurn,
}: GameplayPreferenceOptions): Pick<
	GameEngineContextValue,
	| 'autoAcknowledgeEnabled'
	| 'onToggleAutoAcknowledge'
	| 'autoPassEnabled'
	| 'onToggleAutoPass'
	| 'autoAcknowledgeResolutions'
	| 'onToggleAutoAcknowledgeResolutions'
	| 'autoPassTurn'
	| 'onToggleAutoPassTurn'
> => ({
	autoAcknowledgeEnabled: autoAcknowledgeEnabled ?? false,
	onToggleAutoAcknowledge: onToggleAutoAcknowledge ?? NOOP,
	autoPassEnabled: autoPassEnabled ?? false,
	onToggleAutoPass: onToggleAutoPass ?? NOOP,
	autoAcknowledgeResolutions: autoAcknowledgeResolutions ?? false,
	onToggleAutoAcknowledgeResolutions:
		onToggleAutoAcknowledgeResolutions ?? NOOP,
	autoPassTurn: autoPassTurn ?? false,
	onToggleAutoPassTurn: onToggleAutoPassTurn ?? NOOP,
});
