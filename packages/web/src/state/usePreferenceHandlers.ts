import { useMemo } from 'react';
import type { GameEngineContextValue } from './GameContext.types';

interface PreferenceOptions {
	darkMode?: boolean;
	onToggleDark?: () => void;
	musicEnabled?: boolean;
	onToggleMusic?: () => void;
	soundEnabled?: boolean;
	onToggleSound?: () => void;
	backgroundAudioMuted?: boolean;
	onToggleBackgroundAudioMute?: () => void;
}

type PreferenceHandlers = Pick<
	GameEngineContextValue,
	| 'darkMode'
	| 'onToggleDark'
	| 'musicEnabled'
	| 'onToggleMusic'
	| 'soundEnabled'
	| 'onToggleSound'
	| 'backgroundAudioMuted'
	| 'onToggleBackgroundAudioMute'
>;

export function usePreferenceHandlers({
	darkMode,
	onToggleDark,
	musicEnabled,
	onToggleMusic,
	soundEnabled,
	onToggleSound,
	backgroundAudioMuted,
	onToggleBackgroundAudioMute,
}: PreferenceOptions): PreferenceHandlers {
	return useMemo(
		() => ({
			darkMode: darkMode ?? true,
			onToggleDark: onToggleDark ?? (() => {}),
			musicEnabled: musicEnabled ?? true,
			onToggleMusic: onToggleMusic ?? (() => {}),
			soundEnabled: soundEnabled ?? true,
			onToggleSound: onToggleSound ?? (() => {}),
			backgroundAudioMuted: backgroundAudioMuted ?? true,
			onToggleBackgroundAudioMute: onToggleBackgroundAudioMute ?? (() => {}),
		}),
		[
			darkMode,
			onToggleDark,
			musicEnabled,
			onToggleMusic,
			soundEnabled,
			onToggleSound,
			backgroundAudioMuted,
			onToggleBackgroundAudioMute,
		],
	);
}
