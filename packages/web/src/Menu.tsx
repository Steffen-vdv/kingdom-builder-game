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
	onStart: () => void;
	onStartDev: () => void;
	resumePoint: ResumeSessionRecord | null;
	onContinue: () => void;
	onOverview: () => void;
	onTutorial: () => void;
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
	onStart,
	onStartDev,
	resumePoint,
	onContinue,
	onOverview,
	onTutorial,
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
	const [pendingStart, setPendingStart] = useState<
		'standard' | 'developer' | null
	>(null);
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
	const requestStandardStart = useCallback(() => {
		if (hasResumePoint) {
			setPendingStart('standard');
			return;
		}
		onStart();
	}, [hasResumePoint, onStart]);
	const requestDeveloperStart = useCallback(() => {
		if (hasResumePoint) {
			setPendingStart('developer');
			return;
		}
		onStartDev();
	}, [hasResumePoint, onStartDev]);
	const handleCancelStart = useCallback(() => {
		setPendingStart(null);
	}, []);
	const handleConfirmStart = useCallback(() => {
		if (!pendingStart) {
			return;
		}
		const startMode = pendingStart;
		setPendingStart(null);
		if (startMode === 'developer') {
			onStartDev();
			return;
		}
		onStart();
	}, [onStart, onStartDev, pendingStart]);
	const confirmDialog = useMemo(() => {
		if (!pendingStart) {
			return null;
		}
		const confirmTitle =
			pendingStart === 'developer'
				? 'Start a dev/debug game?'
				: 'Start a new game?';
		const descriptionSegments = formattedResumeTurn
			? [
					'Starting a new game will overwrite your saved session at turn ',
					formattedResumeTurn,
					'. Are you sure you want to continue?',
				]
			: [
					'Starting a new game will overwrite your saved session.',
					' Are you sure you want to continue?',
				];
		const confirmLabel =
			pendingStart === 'developer' ? 'Start dev/debug game' : 'Start new game';
		return (
			<ConfirmDialog
				open
				title={confirmTitle}
				description={descriptionSegments.join('')}
				confirmLabel={confirmLabel}
				cancelLabel="Go back"
				onConfirm={handleConfirmStart}
				onCancel={handleCancelStart}
			/>
		);
	}, [
		formattedResumeTurn,
		handleCancelStart,
		handleConfirmStart,
		pendingStart,
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
						onStart={requestStandardStart}
						onStartDev={requestDeveloperStart}
						resumePoint={resumePoint}
						onContinue={onContinue}
						onOverview={onOverview}
						onTutorial={onTutorial}
						onOpenSettings={() => setSettingsOpen(true)}
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
