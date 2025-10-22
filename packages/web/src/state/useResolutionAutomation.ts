import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { ActionResolution } from './useActionResolution';

interface UseResolutionAutomationOptions {
	autoAdvanceEnabled: boolean;
	acknowledgeResolution: () => void;
	resolution: ActionResolution | null;
	mountedRef: MutableRefObject<boolean>;
	phaseCanEnd: boolean;
	phaseIsAdvancing: boolean;
	advancePhase: () => void | Promise<void>;
}

function useResolutionAutomation({
	autoAdvanceEnabled,
	acknowledgeResolution,
	resolution,
	mountedRef,
	phaseCanEnd,
	phaseIsAdvancing,
	advancePhase,
}: UseResolutionAutomationOptions) {
	const autoAcknowledgedResolutionRef = useRef<ActionResolution | null>(null);
	const autoPassTriggeredRef = useRef(false);

	useEffect(() => {
		if (!autoAdvanceEnabled) {
			autoAcknowledgedResolutionRef.current = null;
			return;
		}
		if (!mountedRef.current) {
			return;
		}
		if (!resolution || !resolution.requireAcknowledgement) {
			autoAcknowledgedResolutionRef.current = null;
			return;
		}
		if (!resolution.isComplete) {
			autoAcknowledgedResolutionRef.current = null;
			return;
		}
		if (autoAcknowledgedResolutionRef.current === resolution) {
			return;
		}
		autoAcknowledgedResolutionRef.current = resolution;
		acknowledgeResolution();
	}, [autoAdvanceEnabled, acknowledgeResolution, mountedRef, resolution]);

	useEffect(() => {
		if (!autoAdvanceEnabled) {
			autoPassTriggeredRef.current = false;
			return;
		}
		if (!mountedRef.current) {
			return;
		}
		if (!phaseCanEnd || phaseIsAdvancing) {
			autoPassTriggeredRef.current = false;
			return;
		}
		if (resolution?.requireAcknowledgement) {
			autoPassTriggeredRef.current = false;
			return;
		}
		if (autoPassTriggeredRef.current) {
			return;
		}
		autoPassTriggeredRef.current = true;
		void advancePhase();
	}, [
		autoAdvanceEnabled,
		phaseCanEnd,
		phaseIsAdvancing,
		resolution,
		advancePhase,
		mountedRef,
	]);
}

export { useResolutionAutomation };
