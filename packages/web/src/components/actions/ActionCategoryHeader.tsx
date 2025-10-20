import React from 'react';

const HEADING_CLASS = [
	'flex flex-wrap items-center gap-2 text-base font-medium',
	'text-slate-900 dark:text-slate-100',
].join(' ');
const SUBTITLE_CLASS = [
	'italic text-sm font-normal text-slate-600',
	'dark:text-slate-300',
].join(' ');
const ICON_CLASS = 'text-lg leading-none';

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
	const { icon, label, subtitle } = descriptor;
	return (
		<header>
			<h3 className={HEADING_CLASS}>
				{icon ? (
					<span aria-hidden className={ICON_CLASS}>
						{icon}
					</span>
				) : null}
				<span>{label}</span>
				<span className={SUBTITLE_CLASS}>{subtitle}</span>
			</h3>
		</header>
	);
}
