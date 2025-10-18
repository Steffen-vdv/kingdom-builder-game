import { useEffect, useMemo, useRef, useState } from 'react';
import type {
	SessionSnapshot,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import { createTranslationContext } from '../translation/context';
import { DEFAULT_REGISTRY_METADATA } from '../contexts/defaultRegistryMetadata';
import type { TranslationContext } from '../translation/context';
export {
	createSessionTranslationDiffContext,
	type SessionTranslationContextData,
} from './createSessionTranslationContext';
import type { GameProviderInnerProps } from './GameProviderInner.types';

type UseSessionTranslationContextOptions = {
	sessionState: GameProviderInnerProps['sessionState'];
	registries: GameProviderInnerProps['registries'];
	ruleSnapshot: GameProviderInnerProps['ruleSnapshot'];
	sessionMetadata: GameProviderInnerProps['sessionMetadata'];
	cachedSessionSnapshot: SessionSnapshot;
	onFatalSessionError?: GameProviderInnerProps['onFatalSessionError'];
};

interface SessionTranslationContextResult {
	translationContext: TranslationContext | null;
	isReady: boolean;
}

export function useSessionTranslationContext({
	sessionState,
	registries,
	ruleSnapshot,
	sessionMetadata,
	cachedSessionSnapshot,
	onFatalSessionError,
}: UseSessionTranslationContextOptions): SessionTranslationContextResult {
	const [capturedFatalError, setCapturedFatalError] = useState<{
		value: unknown;
	} | null>(null);
	const [isHandlingFatal, setIsHandlingFatal] = useState(false);
	const lastTranslationContextRef = useRef<TranslationContext | null>(null);

	const translationContextResult = useMemo<{
		context: TranslationContext | null;
		error: unknown;
	}>(() => {
		const fallbackMetadata = cachedSessionSnapshot.metadata;
		const fallbackModifiers =
			fallbackMetadata?.passiveEvaluationModifiers ?? {};
		const passiveEvaluationModifiers =
			sessionMetadata.passiveEvaluationModifiers ?? fallbackModifiers;
		const fallbackEffectLogs = fallbackMetadata?.effectLogs;
		const effectLogs = sessionMetadata.effectLogs ?? fallbackEffectLogs;
		const metadataPayload: SessionSnapshotMetadata = {
			passiveEvaluationModifiers,
		};
		if (effectLogs !== undefined) {
			metadataPayload.effectLogs = effectLogs;
		}
		const assignMetadataField = <
			K extends Exclude<
				keyof SessionSnapshotMetadata,
				'effectLogs' | 'passiveEvaluationModifiers'
			>,
		>(
			key: K,
		) => {
			const primary = sessionMetadata[key];
			if (primary !== undefined) {
				metadataPayload[key] = primary;
				return;
			}
			const fallback = fallbackMetadata?.[key];
			if (fallback !== undefined) {
				metadataPayload[key] = fallback;
				return;
			}
			const defaults = DEFAULT_REGISTRY_METADATA[key];
			if (defaults !== undefined) {
				metadataPayload[key] = defaults;
			}
		};
		assignMetadataField('resources');
		assignMetadataField('populations');
		assignMetadataField('buildings');
		assignMetadataField('developments');
		assignMetadataField('stats');
		assignMetadataField('phases');
		assignMetadataField('triggers');
		assignMetadataField('assets');
		assignMetadataField('overview');
		try {
			const context = createTranslationContext(
				sessionState,
				registries,
				metadataPayload,
				{
					ruleSnapshot,
					passiveRecords: sessionState.passiveRecords,
				},
			);
			lastTranslationContextRef.current = context;
			return { context, error: null };
		} catch (error) {
			return {
				context: lastTranslationContextRef.current,
				error,
			};
		}
	}, [
		sessionState,
		registries,
		ruleSnapshot,
		sessionState.passiveRecords,
		sessionMetadata,
		cachedSessionSnapshot,
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
