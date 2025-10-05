import React, { useState } from 'react';
import {
	ShowcaseBackground,
	ShowcaseLayout,
} from './components/layouts/ShowcasePage';
import SettingsDialog from './components/settings/SettingsDialog';
import { HeroSection } from './menu/HeroSection';
import { CallToActionSection } from './menu/CallToActionSection';
import { HighlightsSection } from './menu/HighlightsSection';
import { PlayerNamePrompt } from './menu/PlayerNamePrompt';

interface MenuProps {
	onStart: () => void;
	onStartDev: () => void;
	onOverview: () => void;
	onTutorial: () => void;
	darkModeEnabled: boolean;
	onToggleDark: () => void;
	musicEnabled: boolean;
	onToggleMusic: () => void;
	soundEnabled: boolean;
	onToggleSound: () => void;
	playerName: string;
	onChangePlayerName: (name: string) => void;
	hasStoredName: boolean;
}

export default function Menu({
	onStart,
	onStartDev,
	onOverview,
	onTutorial,
	darkModeEnabled,
	onToggleDark,
	musicEnabled,
	onToggleMusic,
	soundEnabled,
	onToggleSound,
	playerName,
	onChangePlayerName,
	hasStoredName,
}: MenuProps) {
	const [isSettingsOpen, setSettingsOpen] = useState(false);
	const showNamePrompt = !hasStoredName;

	return (
		<>
			<ShowcaseBackground>
				<ShowcaseLayout>
					<HeroSection />
					{showNamePrompt ? (
						<PlayerNamePrompt onSubmitName={onChangePlayerName} />
					) : null}
					<CallToActionSection
						onStart={onStart}
						onStartDev={onStartDev}
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
				playerName={playerName}
				onChangePlayerName={onChangePlayerName}
			/>
		</>
	);
}
