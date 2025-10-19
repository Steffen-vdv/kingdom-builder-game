import type {
	SessionRequirementFailure,
	SessionPlayerStateSnapshot,
} from '@kingdom-builder/protocol/session';
import { translateRequirementFailure } from '../translation';
import type { TranslationContext } from '../translation/context';
import type { Action } from './actionTypes';
import { SessionMirroringError, isFatalSessionError } from './sessionErrors';

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
	addLog: (
		entry: string | string[],
		player?: Pick<SessionPlayerStateSnapshot, 'id' | 'name'>,
	) => void;
}

export function createActionErrorHandler({
	fatalErrorRef,
	notifyFatal,
	contextRef,
	action,
	player,
	pushErrorToast,
	addLog,
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
		addLog(`Failed to play ${icon} ${action.name}: ${message}`, {
			id: player.id,
			name: player.name,
		});
		return false;
	};
}
