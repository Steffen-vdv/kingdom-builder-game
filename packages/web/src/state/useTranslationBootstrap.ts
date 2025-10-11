import { useEffect, useMemo, useRef, useState } from 'react';
import { createTranslationContext } from '../translation/context';
import type {
	SessionMetadata,
	SessionRegistries,
	SessionRuleSnapshot,
	SessionSnapshot,
} from './sessionTypes';

export type TranslationContextValue = ReturnType<
	typeof createTranslationContext
>;

interface UseTranslationBootstrapOptions {
	sessionState: SessionSnapshot;
	registries: SessionRegistries;
	ruleSnapshot: SessionRuleSnapshot;
	sessionMetadata: SessionMetadata;
	cachedSessionSnapshot: SessionSnapshot;
	onFatalSessionError?: (error: unknown) => void | Promise<void>;
}

interface TranslationBootstrapResult {
	translationContext: TranslationContextValue | null;
	shouldRenderFallback: boolean;
}

export function useTranslationBootstrap({
	sessionState,
	registries,
	ruleSnapshot,
	sessionMetadata,
	cachedSessionSnapshot,
	onFatalSessionError,
}: UseTranslationBootstrapOptions): TranslationBootstrapResult {
	const [translationError, setTranslationError] = useState<unknown>(null);
	const [isHandlingTranslationFatal, setIsHandlingTranslationFatal] =
		useState(false);
	const handledTranslationErrorRef = useRef<unknown>(null);

	const translationResult = useMemo<{
		context: TranslationContextValue | null;
		error?: unknown;
	}>(() => {
		if (translationError !== null) {
			return { context: null, error: translationError };
		}
		try {
			const fallbackMetadata = cachedSessionSnapshot.metadata;
			const fallbackModifiers =
				fallbackMetadata?.passiveEvaluationModifiers ?? {};
			const passiveEvaluationModifiers =
				sessionMetadata.passiveEvaluationModifiers ?? fallbackModifiers;
			const fallbackEffectLogs = fallbackMetadata?.effectLogs;
			const effectLogs = sessionMetadata.effectLogs ?? fallbackEffectLogs;
			const metadataPayload = effectLogs
				? {
						passiveEvaluationModifiers,
						effectLogs,
					}
				: { passiveEvaluationModifiers };
			return {
				context: createTranslationContext(
					sessionState,
					registries,
					metadataPayload,
					{
						ruleSnapshot,
						passiveRecords: sessionState.passiveRecords,
					},
				),
			};
		} catch (error) {
			return { context: null, error };
		}
	}, [
		translationError,
		sessionState,
		registries,
		ruleSnapshot,
		sessionState.passiveRecords,
		sessionMetadata,
		cachedSessionSnapshot,
	]);

	const translationContext = translationResult.context;
	const translationContextError = translationResult.error;

	useEffect(() => {
		if (translationContextError === undefined) {
			return;
		}
		if (translationContextError === translationError) {
			return;
		}
		setTranslationError(translationContextError);
	}, [translationContextError, translationError]);

	useEffect(() => {
		if (translationError === null) {
			return;
		}
		if (handledTranslationErrorRef.current === translationError) {
			return;
		}
		handledTranslationErrorRef.current = translationError;
		if (!onFatalSessionError) {
			return;
		}
		let disposed = false;
		setIsHandlingTranslationFatal(true);
		const run = async () => {
			try {
				await Promise.resolve(onFatalSessionError(translationError));
			} finally {
				if (!disposed) {
					setIsHandlingTranslationFatal(false);
				}
			}
		};
		void run();
		return () => {
			disposed = true;
		};
	}, [translationError, onFatalSessionError]);

	const shouldRenderFallback =
		translationError !== null ||
		isHandlingTranslationFatal ||
		!translationContext;

	return { translationContext, shouldRenderFallback };
}
