import React from 'react';
import {
	PASSIVE_INFO,
	RESOURCES,
	type ResourceKey,
} from '@kingdom-builder/contents';
import type { EngineContext } from '@kingdom-builder/engine';
import { useGameEngine } from '../../state/GameContext';
import { useValueChangeIndicators } from '../../utils/useValueChangeIndicators';
import { GENERAL_RESOURCE_ICON } from '../../icons';
import { GENERAL_RESOURCE_INFO, PLAYER_INFO_CARD_BG } from './infoCards';
import { summarizeEffects, translateTierSummary } from '../../translation';

type TierDefinition =
	EngineContext['services']['rules']['tierDefinitions'][number];
type TierSummaryEntry = TierDefinition & { active: boolean };

function formatTierRange(tier: TierDefinition) {
	const { min, max } = tier.range;
	if (max === undefined) {
		return `${min}+`;
	}
	if (min === max) {
		return `${min}`;
	}
	return `${min} to ${max}`;
}

function collectSummaryLines(
	entries: ReturnType<typeof summarizeEffects>,
	limit: number,
) {
	if (limit <= 0) {
		return [] as string[];
	}
	const lines: string[] = [];
	const queue = [...entries];
	while (queue.length && lines.length < limit) {
		const entry = queue.shift();
		if (entry === undefined) {
			continue;
		}
		if (typeof entry === 'string') {
			const trimmed = entry.trim();
			if (trimmed && !lines.includes(trimmed)) {
				lines.push(trimmed);
			}
			continue;
		}
		const title = entry.title.trim();
		if (title && !lines.includes(title)) {
			lines.push(title);
		}
		if (lines.length >= limit) {
			break;
		}
		if (entry.items?.length) {
			queue.unshift(...entry.items);
		}
	}
	return lines;
}

function buildTierEntries(
	tiers: TierDefinition[],
	activeId: string | undefined,
	ctx: EngineContext,
) {
	const entries: TierSummaryEntry[] = tiers.map((tier) => ({
		...tier,
		active: tier.id === activeId,
	}));
	return entries.map((entry) => {
		const { preview, display, text, active } = entry;
		const rangeLabel = formatTierRange(entry);
		const statusIcon = active ? '🟢' : '⚪';
		const icon = display?.icon ?? PASSIVE_INFO.icon ?? '';
		const titleParts = [statusIcon, icon, rangeLabel].filter(
			(part) => part && String(part).trim().length > 0,
		);
		const title = titleParts.join(' ').trim();

		const summaryToken = display?.summaryToken;
		const items: string[] = [];
		const translatedSummary = translateTierSummary(summaryToken);
		if (translatedSummary) {
			items.push(translatedSummary);
		} else if (text?.summary) {
			items.push(text.summary.trim());
		}

		const remainingSlots = Math.max(0, 2 - items.length);
		if (remainingSlots > 0) {
			const summaries = collectSummaryLines(
				summarizeEffects(preview?.effects || [], ctx),
				remainingSlots,
			);
			items.push(...summaries);
		}

		if (!items.length) {
			items.push('No tier bonuses active');
		}

		return { title, items };
	});
}

interface ResourceButtonProps {
	resourceKey: keyof typeof RESOURCES;
	value: number;
	onShow: () => void;
	onHide: () => void;
}

const formatDelta = (delta: number) => {
	const absolute = Math.abs(delta);
	const formatted = Number.isInteger(absolute)
		? absolute.toString()
		: absolute.toLocaleString(undefined, {
				maximumFractionDigits: 2,
				minimumFractionDigits: 0,
			});
	return `${delta > 0 ? '+' : '-'}${formatted}`;
};

const ResourceButton: React.FC<ResourceButtonProps> = ({
	resourceKey,
	value,
	onShow,
	onHide,
}) => {
	const info = RESOURCES[resourceKey];
	const changes = useValueChangeIndicators(value);

	return (
		<button
			type="button"
			className="bar-item hoverable cursor-help relative overflow-visible"
			onMouseEnter={onShow}
			onMouseLeave={onHide}
			onFocus={onShow}
			onBlur={onHide}
			onClick={onShow}
			aria-label={`${info.label}: ${value}`}
		>
			{info.icon}
			{value}
			{changes.map((change) => (
				<span
					key={change.id}
					className={`value-change-indicator ${
						change.direction === 'gain'
							? 'value-change-indicator--gain text-emerald-300'
							: 'value-change-indicator--loss text-rose-300'
					}`}
					aria-hidden="true"
				>
					{formatDelta(change.delta)}
				</span>
			))}
		</button>
	);
};

interface ResourceBarProps {
	player: EngineContext['activePlayer'];
}

const ResourceBar: React.FC<ResourceBarProps> = ({ player }) => {
	const { ctx, handleHoverCard, clearHoverCard } = useGameEngine();
	const resourceKeys = Object.keys(RESOURCES) as ResourceKey[];
	const happinessKey = ctx.services.tieredResource.resourceKey as ResourceKey;
	const tiers = ctx.services.rules.tierDefinitions;
	const showHappinessCard = (value: number) => {
		const activeTier = ctx.services.tieredResource.definition(value);
		const entries = buildTierEntries(tiers, activeTier?.id, ctx);
		const info = RESOURCES[happinessKey];
		handleHoverCard({
			title: `${info.icon} ${info.label}`,
			effects: entries,
			requirements: [],
			description: [`Current value: ${value}`],
			bgClass: PLAYER_INFO_CARD_BG,
		});
	};
	const showGeneralResourceCard = () =>
		handleHoverCard({
			title: `${GENERAL_RESOURCE_INFO.icon} ${GENERAL_RESOURCE_INFO.label}`,
			effects: [],
			requirements: [],
			description: GENERAL_RESOURCE_INFO.description,
			bgClass: PLAYER_INFO_CARD_BG,
		});

	return (
		<div className="info-bar resource-bar">
			<button
				type="button"
				className="info-bar__icon hoverable cursor-help"
				aria-label={`${GENERAL_RESOURCE_INFO.label} overview`}
				onMouseEnter={showGeneralResourceCard}
				onMouseLeave={clearHoverCard}
				onFocus={showGeneralResourceCard}
				onBlur={clearHoverCard}
				onClick={showGeneralResourceCard}
			>
				{GENERAL_RESOURCE_ICON}
			</button>
			{resourceKeys.map((k) => {
				const info = RESOURCES[k];
				const v = player.resources[k] ?? 0;
				const showResourceCard = () => {
					if (k === happinessKey) {
						showHappinessCard(v);
						return;
					}
					handleHoverCard({
						title: `${info.icon} ${info.label}`,
						effects: [],
						requirements: [],
						description: info.description,
						bgClass: PLAYER_INFO_CARD_BG,
					});
				};
				return (
					<ResourceButton
						key={k}
						resourceKey={k}
						value={v}
						onShow={showResourceCard}
						onHide={clearHoverCard}
					/>
				);
			})}
		</div>
	);
};

export default ResourceBar;
