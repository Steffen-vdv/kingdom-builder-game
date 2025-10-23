import React, { useMemo } from 'react';
import type { SessionPlayerStateSnapshot } from '@kingdom-builder/protocol/session';

import type { TranslationAssets } from '../../translation/context';
import { useGameEngine } from '../../state/GameContext';
import {
	buildResourceHudEntries,
	type ResourceRowEntry,
} from './resourceHudHelpers';

type ResourceRowVariant = 'parent' | 'child' | 'standalone';

const HUD_CARD_CLASS = [
	'rounded-2xl',
	'border',
	'border-white/40',
	'bg-white/70',
	'px-4',
	'py-3',
	'shadow-sm',
	'dark:border-white/10',
	'dark:bg-slate-900/60',
].join(' ');

const ROW_CLASS: Record<ResourceRowVariant, string> = {
	parent: [
		'flex',
		'items-center',
		'justify-between',
		'gap-3',
		'text-base',
	].join(' '),
	child: [
		'flex',
		'items-center',
		'justify-between',
		'gap-3',
		'pl-6',
		'text-sm',
		'sm:text-base',
	].join(' '),
	standalone: [
		'flex',
		'items-center',
		'justify-between',
		'gap-3',
		'text-base',
	].join(' '),
};

const LABEL_CLASS: Record<ResourceRowVariant, string> = {
	parent: [
		'font-semibold',
		'text-base',
		'text-slate-900',
		'dark:text-slate-100',
	].join(' '),
	child: [
		'font-medium',
		'text-sm',
		'text-slate-900',
		'dark:text-slate-100',
		'sm:text-base',
	].join(' '),
	standalone: [
		'font-medium',
		'text-sm',
		'text-slate-900',
		'dark:text-slate-100',
		'sm:text-base',
	].join(' '),
};

const AMOUNT_CLASS: Record<ResourceRowVariant, string> = {
	parent: [
		'font-semibold',
		'text-base',
		'text-slate-900',
		'dark:text-slate-100',
	].join(' '),
	child: [
		'font-semibold',
		'text-sm',
		'text-slate-900',
		'dark:text-slate-100',
		'sm:text-base',
	].join(' '),
	standalone: [
		'font-semibold',
		'text-sm',
		'text-slate-900',
		'dark:text-slate-100',
		'sm:text-base',
	].join(' '),
};

const BADGE_CLASS = [
	'inline-flex',
	'items-center',
	'rounded-full',
	'bg-slate-900/10',
	'px-2',
	'py-0.5',
	'text-[0.65rem]',
	'font-semibold',
	'uppercase',
	'tracking-wide',
	'text-slate-700',
	'dark:bg-slate-100/10',
	'dark:text-slate-200',
].join(' ');

const BADGE_CONTAINER_CLASS = ['mt-1', 'flex', 'flex-wrap', 'gap-2'].join(' ');
const ROW_CONTENT_CLASS = ['flex', 'min-w-0', 'items-start', 'gap-3'].join(' ');
const ICON_CLASS = 'text-xl';
const HUD_CONTAINER_CLASS = ['flex', 'flex-col', 'gap-3'];

interface ResourceHudProps {
	readonly player: SessionPlayerStateSnapshot;
	readonly className?: string;
}

interface ResourceHudViewProps extends ResourceHudProps {
	readonly assets: TranslationAssets;
}

interface ResourceRowProps {
	readonly entry: ResourceRowEntry;
	readonly variant: ResourceRowVariant;
}

function ResourceRow({ entry, variant }: ResourceRowProps) {
	return (
		<div
			data-testid={`resource-${variant}-${entry.safeId}`}
			className={ROW_CLASS[variant]}
		>
			<div className={ROW_CONTENT_CLASS}>
				<span aria-hidden="true" className={ICON_CLASS}>
					{entry.icon}
				</span>
				<div className="min-w-0">
					<div className={LABEL_CLASS[variant]}>{entry.label}</div>
					{entry.badges.length > 0 && (
						<div className={BADGE_CONTAINER_CLASS}>
							{entry.badges.map((badge) => (
								<span
									key={`${entry.safeId}-${badge.label}`}
									className={BADGE_CLASS}
								>
									{badge.label}
								</span>
							))}
						</div>
					)}
				</div>
			</div>
			<span
				data-testid={`resource-amount-${entry.safeId}`}
				className={AMOUNT_CLASS[variant]}
			>
				{entry.formattedAmount}
			</span>
		</div>
	);
}

export function ResourceHudView({
	player,
	assets,
	className,
}: ResourceHudViewProps) {
	const entries = useMemo(
		() => buildResourceHudEntries(player.values, assets),
		[player.values, assets],
	);

	if (entries.length === 0) {
		return null;
	}

	const containerClass = [...HUD_CONTAINER_CLASS, className]
		.filter(Boolean)
		.join(' ');

	return (
		<div className={containerClass}>
			{entries.map((entry) => {
				if (entry.type === 'parent') {
					return (
						<div key={entry.id} className={HUD_CARD_CLASS}>
							<ResourceRow entry={entry} variant="parent" />
							{entry.children.length > 0 && (
								<div className="mt-2 flex flex-col gap-2">
									{entry.children.map((child) => (
										<ResourceRow key={child.id} entry={child} variant="child" />
									))}
								</div>
							)}
						</div>
					);
				}
				return (
					<div key={entry.id} className={HUD_CARD_CLASS}>
						<ResourceRow entry={entry} variant="standalone" />
					</div>
				);
			})}
		</div>
	);
}

const ResourceHud: React.FC<ResourceHudProps> = ({ player, className }) => {
	const { translationContext } = useGameEngine();
	const viewProps = className ? { className } : undefined;

	return (
		<ResourceHudView
			player={player}
			assets={translationContext.assets}
			{...viewProps}
		/>
	);
};

export default ResourceHud;
