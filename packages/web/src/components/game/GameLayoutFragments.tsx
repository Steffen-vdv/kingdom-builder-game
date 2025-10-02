import React from 'react';
import Button from '../common/Button';
import TimeControl from '../common/TimeControl';
import {
	GAME_OVERLAY_CLASS,
	GAME_BUBBLE_TOP_CLASS,
	GAME_BUBBLE_BOTTOM_CLASS,
	GAME_BUBBLE_RIGHT_CLASS,
	GAME_LIGHTING_CLASS,
	LOADING_CARD_CLASS,
	LOADING_TITLE_CLASS,
	LOADING_TEXT_CLASS,
	HEADER_CONTROLS_CLASS,
} from './layoutClasses';

type ButtonProps = React.ComponentProps<typeof Button>;

type HeaderControlsProps = {
	darkMode: boolean;
	darkModeButtonProps: ButtonProps;
	quitButtonProps: ButtonProps;
};

type LoadingCardProps = {
	description: string;
};

export function GameBackdrop(): JSX.Element {
	return (
		<div className={GAME_OVERLAY_CLASS}>
			<div className={GAME_BUBBLE_TOP_CLASS} />
			<div className={GAME_BUBBLE_BOTTOM_CLASS} />
			<div className={GAME_BUBBLE_RIGHT_CLASS} />
			<div className={GAME_LIGHTING_CLASS} />
		</div>
	);
}

export function LoadingCardContent({
	description,
}: LoadingCardProps): JSX.Element {
	return (
		<div className={LOADING_CARD_CLASS}>
			<h1 className={LOADING_TITLE_CLASS}>Loading your realm...</h1>
			<p className={LOADING_TEXT_CLASS}>{description}</p>
		</div>
	);
}

export function HeaderControls({
	darkMode,
	darkModeButtonProps,
	quitButtonProps,
}: HeaderControlsProps): JSX.Element {
	return (
		<div className={HEADER_CONTROLS_CLASS}>
			<TimeControl />
			<Button {...darkModeButtonProps}>
				{darkMode ? 'Light Mode' : 'Dark Mode'}
			</Button>
			<Button {...quitButtonProps}>Quit</Button>
		</div>
	);
}
