import React, { useCallback, useMemo, useState } from 'react';
import {
	ShowcaseBackground,
	ShowcaseLayout,
} from './components/layouts/ShowcasePage';
import SettingsDialog from './components/settings/SettingsDialog';
import { HeroSection } from './menu/HeroSection';
import { CallToActionSection } from './menu/CallToActionSection';
import { HighlightsSection } from './menu/HighlightsSection';
import { PlayerNamePrompt } from './menu/PlayerNamePrompt';
import { useKeybindingPreferences } from './state/keybindings';
import type { ResumeSessionRecord } from './state/sessionResumeStorage';
import ConfirmDialog from './components/common/ConfirmDialog';

const RESUME_TURN_FORMATTER = new Intl.NumberFormat('en-US');

interface MenuProps {
	onStartGame: (contentId: string) => void;
	onOpenPlayground: () => void;
	resumePoint: ResumeSessionRecord | null;
	onContinue: () => void;
	darkModeEnabled: boolean;
	onToggleDark: () => void;
	musicEnabled: boolean;
	onToggleMusic: () => void;
	soundEnabled: boolean;
	onToggleSound: () => void;
	backgroundAudioMuted: boolean;
	onToggleBackgroundAudioMute: () => void;
	autoAdvanceEnabled: boolean;
	onToggleAutoAdvance: () => void;
	playerName: string;
	onChangePlayerName: (name: string) => void;
	hasStoredName: boolean;
}

export default function Menu({
	onStartGame,
	onOpenPlayground,
	resumePoint,
	onContinue,
	darkModeEnabled,
	onToggleDark,
	musicEnabled,
	onToggleMusic,
	soundEnabled,
	onToggleSound,
	backgroundAudioMuted,
	onToggleBackgroundAudioMute,
	autoAdvanceEnabled,
	onToggleAutoAdvance,
	playerName,
	onChangePlayerName,
	hasStoredName,
}: MenuProps) {
	const [isSettingsOpen, setSettingsOpen] = useState(false);
	const [pendingContentId, setPendingContentId] = useState<string | null>(null);
	const showNamePrompt = !hasStoredName;
	const {
		keybinds: controlKeybinds,
		setControlKeybind,
		resetControlKeybind,
	} = useKeybindingPreferences();
	const hasResumePoint = Boolean(resumePoint);
	const formattedResumeTurn = useMemo(() => {
		if (!resumePoint) {
			return null;
		}
		const resumeTurn = Math.max(1, Math.round(resumePoint.turn));
		return RESUME_TURN_FORMATTER.format(resumeTurn);
	}, [resumePoint]);
	const requestStart = useCallback(
		(contentId: string) => {
			if (hasResumePoint) {
				setPendingContentId(contentId);
				return;
			}
			onStartGame(contentId);
		},
		[hasResumePoint, onStartGame],
	);
	const handleCancelStart = useCallback(() => {
		setPendingContentId(null);
	}, []);
	const handleConfirmStart = useCallback(() => {
		if (!pendingContentId) {
			return;
		}
		const id = pendingContentId;
		setPendingContentId(null);
		onStartGame(id);
	}, [onStartGame, pendingContentId]);
	const confirmDialog = useMemo(() => {
		if (!pendingContentId) {
			return null;
		}
		const descriptionSegments = formattedResumeTurn
			? [
					'Starting a new game will overwrite your',
					' saved session at turn ',
					formattedResumeTurn,
					'. Are you sure you want to continue?',
				]
			: [
					'Starting a new game will overwrite your',
					' saved session.',
					' Are you sure you want to continue?',
				];
		return (
			<ConfirmDialog
				open
				title="Start a new game?"
				description={descriptionSegments.join('')}
				confirmLabel="Start new game"
				cancelLabel="Go back"
				onConfirm={handleConfirmStart}
				onCancel={handleCancelStart}
			/>
		);
	}, [
		formattedResumeTurn,
		handleCancelStart,
		handleConfirmStart,
		pendingContentId,
	]);

	return (
		<>
			<ShowcaseBackground>
				<ShowcaseLayout>
					<HeroSection />
					{showNamePrompt ? (
						<PlayerNamePrompt onSubmitName={onChangePlayerName} />
					) : null}
					<CallToActionSection
						onStartGame={requestStart}
						resumePoint={resumePoint}
						onContinue={onContinue}
						onOpenSettings={() => setSettingsOpen(true)}
						onOpenPlayground={onOpenPlayground}
					/>
					<HighlightsSection />
				</ShowcaseLayout>
			</ShowcaseBackground>
			<SettingsDialog
				open={isSettingsOpen}
				onClose={() => setSettingsOpen(false)}
				darkMode={darkModeEnabled}
				onToggleDark={onToggleDark}
				musicEnabled={musicEnabled}
				onToggleMusic={onToggleMusic}
				soundEnabled={soundEnabled}
				onToggleSound={onToggleSound}
				backgroundAudioMuted={backgroundAudioMuted}
				onToggleBackgroundAudioMute={onToggleBackgroundAudioMute}
				autoAdvanceEnabled={autoAdvanceEnabled}
				onToggleAutoAdvance={onToggleAutoAdvance}
				playerName={playerName}
				onChangePlayerName={onChangePlayerName}
				controlKeybinds={controlKeybinds}
				onChangeControlKeybind={setControlKeybind}
				onResetControlKeybind={resetControlKeybind}
			/>
			{confirmDialog}
		</>
	);
}
