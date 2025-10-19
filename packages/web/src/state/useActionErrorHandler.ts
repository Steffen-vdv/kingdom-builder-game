import type {
	SessionRequirementFailure,
	SessionPlayerStateSnapshot,
} from '@kingdom-builder/protocol/session';
import { translateRequirementFailure } from '../translation';
import type { TranslationContext } from '../translation/context';
import type { Action } from './actionTypes';
import { SessionMirroringError, isFatalSessionError } from './sessionErrors';
import {
	buildActionLogTimeline,
	formatActionLogLines,
} from './actionLogFormat';
import { buildResolutionActionMeta } from './deriveResolutionActionName';
import { createResolutionLogSnapshot } from './createResolutionLogSnapshot';
import type { ActionResolution } from './useActionResolution';

type RequirementFailureCarrier = {
	requirementFailure?: SessionRequirementFailure;
	requirementFailures?: SessionRequirementFailure[];
};

interface ActionErrorHandlerOptions {
	fatalErrorRef: { current: unknown };
	notifyFatal: (error: unknown) => void;
	contextRef: { current: TranslationContext };
	action: Action;
	player: Pick<SessionPlayerStateSnapshot, 'id' | 'name'>;
	pushErrorToast: (message: string) => void;
	addResolutionLog: (resolution: ActionResolution) => void;
}

export function createActionErrorHandler({
	fatalErrorRef,
	notifyFatal,
	contextRef,
	action,
	player,
	pushErrorToast,
	addResolutionLog,
}: ActionErrorHandlerOptions) {
	return (error: unknown): boolean => {
		if (fatalErrorRef.current !== null || isFatalSessionError(error)) {
			if (fatalErrorRef.current === null) {
				fatalErrorRef.current = error;
				notifyFatal(error);
			}
			return true;
		}
		if (error instanceof SessionMirroringError) {
			fatalErrorRef.current = error;
			notifyFatal(error);
			return true;
		}
		const context = contextRef.current;
		const icon = context.actions.get(action.id)?.icon || '';
		let message = (error as Error).message || 'Action failed';
		const executionError = error as RequirementFailureCarrier;
		const requirementFailure =
			executionError.requirementFailure ??
			executionError.requirementFailures?.[0];
		if (requirementFailure) {
			message = translateRequirementFailure(requirementFailure, context);
		}
		pushErrorToast(message);
		const actionDefinition = context.actions.get(action.id);
		const decoratedIcon = icon || actionDefinition?.icon || '';
		const actionLabel = [decoratedIcon, action.name]
			.map((part) => part?.trim())
			.filter(Boolean)
			.join(' ');
		const attemptLine = actionLabel
			? `Attempted to play ${actionLabel}`
			: 'Attempted to play an action';
		const reasonLine = message ? `Reason: ${message}` : '';
		const messages = [
			{
				text: 'Action failed',
				depth: 0,
				kind: 'headline' as const,
			},
			{
				text: attemptLine,
				depth: 1,
				kind: 'effect' as const,
			},
		];
		const changeLines = reasonLine ? [reasonLine] : [];
		const timeline = buildActionLogTimeline(messages, changeLines);
		const logLines = formatActionLogLines(messages, changeLines);
		const actionMeta = buildResolutionActionMeta(
			action,
			actionDefinition,
			'Action failed',
		);
		const source = {
			kind: 'action' as const,
			label: 'Action',
			id: actionMeta.id,
			name: actionMeta.name,
			icon: actionMeta.icon ?? '',
		};
		const resolution = createResolutionLogSnapshot({
			lines: logLines,
			timeline,
			summaries: changeLines,
			player: {
				id: player.id,
				name: player.name,
			},
			action: actionMeta,
			source,
			actorLabel: 'Played by',
		});
		addResolutionLog(resolution);
		return false;
	};
}
