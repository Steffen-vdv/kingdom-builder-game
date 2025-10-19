import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import {
	getActionErrorMetadata,
	setActionErrorMetadata,
} from './actionErrorMetadata';

interface ActionErrorMetadataRequest {
	sessionId: string;
	actionId: string;
	params?: ActionParametersPayload;
}

export function createActionErrorMetadataEnsurer(
	request: ActionErrorMetadataRequest,
	baseContext: Record<string, unknown>,
) {
	return (
		target: unknown,
		extraContext: Record<string, unknown> = {},
	): void => {
		if (!target || typeof target !== 'object') {
			return;
		}
		const metadata = getActionErrorMetadata(target);
		const contextDetails = { ...baseContext, ...extraContext };
		if (metadata) {
			setActionErrorMetadata(target, {
				...metadata,
				context: {
					...(metadata.context ?? {}),
					...contextDetails,
				},
			});
			return;
		}
		setActionErrorMetadata(target, {
			request,
			context: contextDetails,
		});
	};
}
