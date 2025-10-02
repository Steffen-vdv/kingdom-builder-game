import React, { useMemo, useState } from 'react';
import {
	ShowcaseBackground,
	ShowcaseLayout,
	SHOWCASE_BADGE_CLASS,
	SHOWCASE_INTRO_CLASS,
} from './components/layouts/ShowcasePage';
import ConfirmDialog from './components/common/ConfirmDialog';
import { HighlightsSection } from './components/menu/HighlightsSection';
import {
	CallToActionSection,
	type CallToActionSectionProps,
} from './components/menu/CallToActionSection';
import type { SavedGameMeta } from './state/persistence';

interface MenuProps {
	onStart: () => void;
	onStartDev: () => void;
	onOverview: () => void;
	onTutorial: () => void;
	onContinue?: () => void;
	onDiscardSave?: () => void;
	savedGameMeta?: SavedGameMeta | null;
}

const INTRO_PARAGRAPH_TEXT = [
	'Craft a flourishing dynasty with tactical choices,',
	'evolving lands, and a thriving population.',
	'Each turn is a new chapter in your royal saga.',
].join(' ');

function HeroSection() {
	return (
		<header className="flex flex-col items-center text-center">
			<span className={SHOWCASE_BADGE_CLASS}>
				<span className="text-lg">🏰</span>
				<span>Rule Your Realm</span>
			</span>
			<h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
				Kingdom Builder
			</h1>
			<p className={SHOWCASE_INTRO_CLASS}>{INTRO_PARAGRAPH_TEXT}</p>
		</header>
	);
}

export default function Menu({
	onStart,
	onStartDev,
	onOverview,
	onTutorial,
	onContinue,
	onDiscardSave,
	savedGameMeta = null,
}: MenuProps) {
	const [overwriteDialogOpen, setOverwriteDialogOpen] = useState(false);
	const hasSave = savedGameMeta !== null;

	const handleStart = () => {
		if (hasSave) {
			setOverwriteDialogOpen(true);
			return;
		}
		onStart();
	};

	const handleConfirmOverwrite = () => {
		onDiscardSave?.();
		setOverwriteDialogOpen(false);
		onStart();
	};

	const handleContinue = () => {
		onContinue?.();
	};

	const closeDialog = () => setOverwriteDialogOpen(false);

	const description = useMemo(() => {
		if (!savedGameMeta) {
			return 'Starting a new game will overwrite your existing progress.';
		}
		return [
			'Starting a new game will overwrite your current campaign at Turn',
			`${savedGameMeta.turn}.`,
		].join(' ');
	}, [savedGameMeta]);

	const callToActionProps: CallToActionSectionProps = {
		onStart: handleStart,
		onStartDev,
		onOverview,
		onTutorial,
	};

	if (hasSave && onContinue) {
		callToActionProps.onContinue = handleContinue;
	}

	if (savedGameMeta !== null) {
		callToActionProps.savedGameMeta = savedGameMeta;
	}

	return (
		<ShowcaseBackground>
			<ShowcaseLayout>
				<HeroSection />
				<CallToActionSection {...callToActionProps} />
				<HighlightsSection />
			</ShowcaseLayout>
			<ConfirmDialog
				open={overwriteDialogOpen}
				onClose={closeDialog}
				title="Start a new game?"
				description={<p>{description}</p>}
				actions={[
					{
						label: 'Overwrite and start',
						variant: 'danger',
						onClick: handleConfirmOverwrite,
					},
					{
						label: 'Cancel',
						variant: 'ghost',
						onClick: () => {},
					},
				]}
			/>
		</ShowcaseBackground>
	);
}
