import React from 'react';

const SUBTITLE_CLASS = [
	'text-sm font-normal italic text-slate-600',
	'dark:text-slate-300',
].join(' ');

export interface ActionCategoryDescriptor {
	icon?: React.ReactNode;
	label: string;
	subtitle: string;
}

interface ActionCategoryHeaderProps {
	descriptor: ActionCategoryDescriptor;
}

export default function ActionCategoryHeader({
	descriptor,
}: ActionCategoryHeaderProps) {
	const subtitle = descriptor.subtitle?.trim();
	if (!subtitle) {
		return null;
	}
	const formattedSubtitle =
		subtitle.startsWith('(') && subtitle.endsWith(')')
			? subtitle
			: `(${subtitle})`;
	return (
		<header>
			<p className={SUBTITLE_CLASS}>{formattedSubtitle}</p>
		</header>
	);
}
