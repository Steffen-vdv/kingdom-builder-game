import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { renderSummary, renderCosts } from '../translation/render';
import { useGameEngine } from '../state/GameContext';
import {
	CARD_ALERT_TEXT_CLASS,
	CARD_BASE_CLASS,
	CARD_BODY_TEXT_CLASS,
	CARD_LABEL_CLASS,
	CARD_LIST_CLASS,
	CARD_META_TEXT_CLASS,
	CARD_REQUIREMENT_LIST_CLASS,
	CARD_TITLE_TEXT_CLASS,
	joinClasses,
} from './common/cardStyles';
import { ResolutionCard } from './ResolutionCard';
import { MultiStepIndicator } from './actions/StepBadge';

const FADE_DURATION_MS = 200;

export default function HoverCard() {
	const {
		hoverCard: rawHoverCard,
		clearHoverCard,
		translationContext,
		actionCostResource,
		resolution: actionResolution,
		acknowledgeResolution,
		sessionSnapshot,
		phase,
		requests,
	} = useGameEngine();
	const { advancePhase } = requests;
	const shouldSuppressHoverCards = Boolean(
		actionResolution &&
			(!actionResolution.requireAcknowledgement ||
				!actionResolution.isComplete),
	);
	const data = shouldSuppressHoverCards ? null : rawHoverCard;
	const [renderedData, setRenderedData] = useState(data);
	const [transitionState, setTransitionState] = useState<'enter' | 'exit'>(
		data ? 'enter' : 'exit',
	);
	const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const showRafRef = useRef<number | null>(null);

	useEffect(() => {
		if (!data) {
			return;
		}

		if (hideTimeoutRef.current !== null) {
			clearTimeout(hideTimeoutRef.current);
			hideTimeoutRef.current = null;
		}

		setRenderedData(data);

		if (typeof window === 'undefined') {
			setTransitionState('enter');
			return;
		}

		if (showRafRef.current !== null) {
			cancelAnimationFrame(showRafRef.current);
		}

		showRafRef.current = window.requestAnimationFrame(() => {
			setTransitionState('enter');
			showRafRef.current = null;
		});
	}, [data]);

	useEffect(() => {
		if (data) {
			return;
		}

		if (!renderedData) {
			setTransitionState('exit');
			return;
		}

		setTransitionState('exit');
		hideTimeoutRef.current = setTimeout(() => {
			setRenderedData(null);
			hideTimeoutRef.current = null;
		}, FADE_DURATION_MS);

		return () => {
			if (hideTimeoutRef.current !== null) {
				clearTimeout(hideTimeoutRef.current);
				hideTimeoutRef.current = null;
			}
		};
	}, [data, renderedData]);

	useEffect(
		() => () => {
			if (hideTimeoutRef.current !== null) {
				clearTimeout(hideTimeoutRef.current);
			}
			if (showRafRef.current !== null) {
				cancelAnimationFrame(showRafRef.current);
			}
		},
		[],
	);

	const shouldShowNextTurn = useMemo(() => {
		if (!actionResolution) {
			return false;
		}
		if (!actionResolution.requireAcknowledgement) {
			return false;
		}
		const source = actionResolution.source;
		const sourceKind =
			typeof source === 'string'
				? source
				: source && typeof source === 'object'
					? source.kind
					: null;
		const isActionSource =
			sourceKind === 'action' || Boolean(actionResolution.action);
		if (!isActionSource) {
			return false;
		}
		if (!phase.isActionPhase || phase.isAdvancing) {
			return false;
		}
		if (sessionSnapshot.game.conclusion) {
			return false;
		}
		const activePlayerId =
			phase.activePlayerId ?? actionResolution.player?.id ?? null;
		if (!activePlayerId) {
			return false;
		}
		const activePlayer = sessionSnapshot.game.players.find(
			(player) => player.id === activePlayerId,
		);
		if (!activePlayer) {
			return false;
		}
		const remainingActions = activePlayer.resources?.[actionCostResource] ?? 0;
		if (remainingActions > 0) {
			return false;
		}
		const isAiControlled = Boolean(activePlayer.aiControlled);
		if (!isAiControlled && !phase.canEndTurn) {
			return false;
		}
		return true;
	}, [
		actionResolution,
		actionCostResource,
		phase.activePlayerId,
		phase.canEndTurn,
		phase.isActionPhase,
		phase.isAdvancing,
		sessionSnapshot.game.conclusion,
		sessionSnapshot.game.players,
	]);

	const handleActiveResolutionContinue = useCallback(() => {
		acknowledgeResolution();
		if (shouldShowNextTurn) {
			void advancePhase();
		}
	}, [acknowledgeResolution, advancePhase, shouldShowNextTurn]);

	const resolutionTitle =
		data?.title ?? renderedData?.title ?? 'Action Resolution';
	if (actionResolution && !data) {
		return (
			<ResolutionCard
				title={resolutionTitle}
				resolution={actionResolution}
				onContinue={handleActiveResolutionContinue}
				continueMode={shouldShowNextTurn ? 'next-turn' : 'continue'}
			/>
		);
	}

	if (!renderedData) {
		return null;
	}

	if (renderedData.resolution) {
		const historicTitle = renderedData.resolutionTitle ?? renderedData.title;
		return (
			<ResolutionCard
				title={historicTitle}
				resolution={renderedData.resolution}
				onContinue={() => {}}
			/>
		);
	}

	const cardContainerClass = joinClasses(
		CARD_BASE_CLASS,
		'pointer-events-none',
		renderedData.bgClass,
	);
	const headerRowClass = 'mb-3 flex items-start justify-between gap-4';
	const headerTitleClass = 'flex items-center gap-2';
	const costTextClass = joinClasses('text-right', CARD_META_TEXT_CLASS);
	const effectsTitle = renderedData.effectsTitle ?? 'Effects';
	const effectSummary = renderSummary(renderedData.effects);
	const descriptionTitle = renderedData.descriptionTitle ?? 'Description';
	const descriptionLabelClass = joinClasses(
		CARD_LABEL_CLASS,
		renderedData.descriptionClass,
	);
	const descriptionTextClass = joinClasses(
		'mt-1',
		CARD_BODY_TEXT_CLASS,
		renderedData.descriptionClass,
	);
	const descriptionListClass = joinClasses(
		CARD_LIST_CLASS,
		renderedData.descriptionClass,
	);
	const shouldShowFreeLabel = renderedData.costs !== undefined;
	const renderCostOptions = {
		showFreeLabel: shouldShowFreeLabel,
		assets: translationContext.assets,
	};
	const hoverActionCostResource = renderedData.showGlobalActionCost
		? undefined
		: actionCostResource;

	const multiStepIndicator = renderedData.multiStep ? (
		<MultiStepIndicator className="mt-0.5 shrink-0" />
	) : null;

	return (
		<div
			data-state={transitionState}
			className={cardContainerClass}
			onMouseLeave={clearHoverCard}
		>
			<div className={headerRowClass}>
				<div className={headerTitleClass}>
					{multiStepIndicator}
					<div className={CARD_TITLE_TEXT_CLASS}>{renderedData.title}</div>
				</div>
				<div className={costTextClass}>
					{renderCosts(
						renderedData.costs,
						translationContext.activePlayer.resources,
						hoverActionCostResource,
						renderedData.upkeep,
						renderCostOptions,
					)}
				</div>
			</div>
			{renderedData.effects.length > 0 && (
				<div className="mb-2">
					<div className={CARD_LABEL_CLASS}>{effectsTitle}</div>
					<ul className={CARD_LIST_CLASS}>{effectSummary}</ul>
				</div>
			)}
			{(() => {
				const desc = renderedData.description;
				const hasDescription =
					typeof desc === 'string'
						? desc.trim().length > 0
						: Array.isArray(desc) && desc.length > 0;
				if (!hasDescription) {
					return null;
				}
				return (
					<div className="mt-2">
						<div className={descriptionLabelClass}>{descriptionTitle}</div>
						{typeof desc === 'string' ? (
							<div className={descriptionTextClass}>{desc}</div>
						) : (
							<ul className={descriptionListClass}>{renderSummary(desc)}</ul>
						)}
					</div>
				);
			})()}
			{renderedData.requirements.length > 0 && (
				<div className={CARD_ALERT_TEXT_CLASS}>
					<div className={CARD_LABEL_CLASS}>Requirements</div>
					<ul className={CARD_REQUIREMENT_LIST_CLASS}>
						{renderedData.requirements.map((requirement, index) => (
							<li key={index}>{requirement}</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
