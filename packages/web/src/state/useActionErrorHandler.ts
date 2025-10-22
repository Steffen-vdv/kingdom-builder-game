import type {
	SessionRequirementFailure,
	SessionPlayerStateSnapshot,
} from '@kingdom-builder/protocol/session';
import { translateRequirementFailure } from '../translation';
import type { TranslationContext } from '../translation/context';
import type { Action } from './actionTypes';
import { SessionMirroringError, isFatalSessionError } from './sessionErrors';
import { createFailureResolutionSnapshot } from './actionResolutionLog';
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
		const headline = icon
			? `Failed to play ${icon} ${action.name}`
			: `Failed to play ${action.name}`;
		const resolution = createFailureResolutionSnapshot({
			action,
			stepDefinition: context.actions.get(action.id),
			player: { id: player.id, name: player.name },
			detail: message,
			headline,
			actionCategories: context.actionCategories,
		});
		addResolutionLog(resolution);
		return false;
	};
}
