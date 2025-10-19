import { useEffect, useMemo, useRef, useState } from 'react';
import type {
	SessionSnapshot,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
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
	cachedSessionSnapshot: SessionSnapshot;
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
		const metadataPayload: SessionSnapshotMetadata = {
			passiveEvaluationModifiers:
				sessionMetadata.passiveEvaluationModifiers ??
				fallbackMetadata?.passiveEvaluationModifiers ??
				{},
		};
		const effectLogs =
			sessionMetadata.effectLogs ?? fallbackMetadata?.effectLogs;
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
				sessionSnapshot,
				registries,
				metadataPayload,
				{
					ruleSnapshot,
					passiveRecords: sessionSnapshot.passiveRecords,
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
		sessionSnapshot,
		registries,
		ruleSnapshot,
		sessionSnapshot.passiveRecords,
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
