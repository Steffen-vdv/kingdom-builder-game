import { useEffect, useMemo, useState } from 'react';
import { createTranslationContext } from '../translation/context';
import type { TranslationContext } from '../translation/context';
export {
	createSessionTranslationDiffContext,
	type SessionTranslationContextData,
} from './createSessionTranslationContext';
import type { GameProviderInnerProps } from './GameProviderInner.types';

type UseSessionTranslationContextOptions = {
	sessionSnapshot: GameProviderInnerProps['sessionSnapshot'];
	registries: GameProviderInnerProps['registries'];
	ruleSnapshot: GameProviderInnerProps['ruleSnapshot'];
	sessionMetadata: GameProviderInnerProps['sessionMetadata'];
	onFatalSessionError?: GameProviderInnerProps['onFatalSessionError'];
};

interface SessionTranslationContextResult {
	translationContext: TranslationContext | null;
	isReady: boolean;
}

export function useSessionTranslationContext({
	sessionSnapshot,
	registries,
	ruleSnapshot,
	sessionMetadata,
	onFatalSessionError,
}: UseSessionTranslationContextOptions): SessionTranslationContextResult {
	const [capturedFatalError, setCapturedFatalError] = useState<{
		value: unknown;
	} | null>(null);
	const [isHandlingFatal, setIsHandlingFatal] = useState(false);

	const translationContextResult = useMemo<{
		context: TranslationContext | null;
		error: unknown;
	}>(() => {
		try {
			const context = createTranslationContext(
				sessionSnapshot,
				registries,
				sessionMetadata,
				{
					ruleSnapshot,
					passiveRecords: sessionSnapshot.passiveRecords,
				},
			);
			return { context, error: null };
		} catch (error) {
			return {
				context: null,
				error,
			};
		}
	}, [
		sessionSnapshot,
		registries,
		ruleSnapshot,
		sessionSnapshot.passiveRecords,
		sessionMetadata,
	]);

	const immediateError = translationContextResult.error;

	useEffect(() => {
		if (immediateError === null) {
			return;
		}
		setCapturedFatalError((previous) =>
			previous === null ? { value: immediateError } : previous,
		);
	}, [immediateError]);

	useEffect(() => {
		if (capturedFatalError === null) {
			return;
		}
		if (!onFatalSessionError) {
			return;
		}
		let disposed = false;
		const run = async () => {
			setIsHandlingFatal(true);
			try {
				await Promise.resolve(onFatalSessionError(capturedFatalError.value));
			} catch (fatalError) {
				console.error(fatalError);
			} finally {
				if (!disposed) {
					setIsHandlingFatal(false);
				}
			}
		};
		void run();
		return () => {
			disposed = true;
		};
	}, [capturedFatalError, onFatalSessionError]);

	const translationContext = translationContextResult.context;
	const isReady =
		translationContext !== null &&
		immediateError === null &&
		capturedFatalError === null &&
		!isHandlingFatal;

	return { translationContext, isReady };
}
