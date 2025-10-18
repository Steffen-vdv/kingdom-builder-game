import { useEffect, useMemo, useRef, useState } from 'react';
import type {
	SessionMetadataDescriptor,
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
		type DescriptorRecordKey =
			| 'resources'
			| 'populations'
			| 'buildings'
			| 'developments'
			| 'stats'
			| 'assets';
		const mergeDescriptor = (
			primary: SessionMetadataDescriptor | undefined,
			fallback: SessionMetadataDescriptor | undefined,
		): SessionMetadataDescriptor | undefined => {
			if (!primary && !fallback) {
				return undefined;
			}
			const descriptor: SessionMetadataDescriptor = {};
			if (primary?.label !== undefined) {
				descriptor.label = primary.label;
			} else if (fallback?.label !== undefined) {
				descriptor.label = fallback.label;
			}
			if (primary?.icon !== undefined) {
				descriptor.icon = primary.icon;
			} else if (fallback?.icon !== undefined) {
				descriptor.icon = fallback.icon;
			}
			if (primary?.description !== undefined) {
				descriptor.description = primary.description;
			} else if (fallback?.description !== undefined) {
				descriptor.description = fallback.description;
			}
			if (primary?.displayAsPercent !== undefined) {
				descriptor.displayAsPercent = primary.displayAsPercent;
			} else if (fallback?.displayAsPercent !== undefined) {
				descriptor.displayAsPercent = fallback.displayAsPercent;
			}
			if (primary?.format !== undefined) {
				descriptor.format = primary.format;
			} else if (fallback?.format !== undefined) {
				descriptor.format = fallback.format;
			}
			return Object.keys(descriptor).length > 0 ? descriptor : undefined;
		};
		const mergeDescriptorRecord = (
			primary: Record<string, SessionMetadataDescriptor> | undefined,
			fallback: Record<string, SessionMetadataDescriptor> | undefined,
		) => {
			if (!primary && !fallback) {
				return undefined;
			}
			const keys = new Set<string>([
				...Object.keys(fallback ?? {}),
				...Object.keys(primary ?? {}),
			]);
			const merged: Record<string, SessionMetadataDescriptor> = {};
			for (const key of keys) {
				const descriptor = mergeDescriptor(primary?.[key], fallback?.[key]);
				if (descriptor) {
					merged[key] = descriptor;
				}
			}
			return Object.keys(merged).length > 0 ? merged : undefined;
		};
		const assignDescriptorField = (key: DescriptorRecordKey) => {
			const merged = mergeDescriptorRecord(
				sessionMetadata[key],
				fallbackMetadata?.[key],
			);
			if (merged) {
				metadataPayload[key] = merged;
			}
		};
		assignDescriptorField('resources');
		assignDescriptorField('populations');
		assignDescriptorField('buildings');
		assignDescriptorField('developments');
		assignDescriptorField('stats');
		assignDescriptorField('assets');
		const assignMetadataField = <
			K extends Extract<
				keyof SessionSnapshotMetadata,
				'phases' | 'triggers' | 'overview'
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
		assignMetadataField('phases');
		assignMetadataField('triggers');
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
