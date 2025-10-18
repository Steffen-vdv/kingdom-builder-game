import { useEffect, useMemo, useRef, useState } from 'react';
import type {
	SessionMetadataDescriptor,
	SessionSnapshot,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import { createTranslationContext } from '../translation/context';
import type { TranslationContext } from '../translation/context';
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

function cloneDescriptor(
	descriptor: SessionMetadataDescriptor | undefined,
): SessionMetadataDescriptor | undefined {
	if (!descriptor) {
		return undefined;
	}
	const cloned: SessionMetadataDescriptor = {};
	if ('label' in descriptor && descriptor.label !== undefined) {
		cloned.label = descriptor.label;
	}
	if ('icon' in descriptor && descriptor.icon !== undefined) {
		cloned.icon = descriptor.icon;
	}
	if ('description' in descriptor && descriptor.description !== undefined) {
		cloned.description = descriptor.description;
	}
	if (
		'displayAsPercent' in descriptor &&
		descriptor.displayAsPercent !== undefined
	) {
		cloned.displayAsPercent = descriptor.displayAsPercent;
	}
	if ('format' in descriptor && descriptor.format !== undefined) {
		cloned.format =
			typeof descriptor.format === 'string'
				? descriptor.format
				: { ...descriptor.format };
	}
	return cloned;
}

function mergeDescriptor(
	descriptor: SessionMetadataDescriptor | undefined,
	fallback: SessionMetadataDescriptor | undefined,
): SessionMetadataDescriptor | undefined {
	if (!descriptor && !fallback) {
		return undefined;
	}
	if (!descriptor) {
		return cloneDescriptor(fallback);
	}
	if (!fallback) {
		return cloneDescriptor(descriptor);
	}
	const merged: SessionMetadataDescriptor = {};
	if (descriptor.label !== undefined) {
		merged.label = descriptor.label;
	} else if (fallback.label !== undefined) {
		merged.label = fallback.label;
	}
	if (descriptor.icon !== undefined) {
		merged.icon = descriptor.icon;
	} else if (fallback.icon !== undefined) {
		merged.icon = fallback.icon;
	}
	if (descriptor.description !== undefined) {
		merged.description = descriptor.description;
	} else if (fallback.description !== undefined) {
		merged.description = fallback.description;
	}
	if (descriptor.displayAsPercent !== undefined) {
		merged.displayAsPercent = descriptor.displayAsPercent;
	} else if (fallback.displayAsPercent !== undefined) {
		merged.displayAsPercent = fallback.displayAsPercent;
	}
	if (descriptor.format !== undefined) {
		merged.format =
			typeof descriptor.format === 'string'
				? descriptor.format
				: { ...descriptor.format };
	} else if (fallback.format !== undefined) {
		merged.format =
			typeof fallback.format === 'string'
				? fallback.format
				: { ...fallback.format };
	}
	return merged;
}

function cloneDescriptorRecord(
	record: Record<string, SessionMetadataDescriptor>,
): Record<string, SessionMetadataDescriptor> {
	const entries = Object.entries(record);
	const cloned: Record<string, SessionMetadataDescriptor> = {};
	for (const [key, descriptor] of entries) {
		const clonedDescriptor = cloneDescriptor(descriptor);
		if (clonedDescriptor) {
			cloned[key] = clonedDescriptor;
		}
	}
	return cloned;
}

function mergeDescriptorRecords(
	descriptors: Record<string, SessionMetadataDescriptor> | undefined,
	fallback: Record<string, SessionMetadataDescriptor> | undefined,
): Record<string, SessionMetadataDescriptor> | undefined {
	if (!descriptors && !fallback) {
		return undefined;
	}
	if (!fallback) {
		return descriptors ? cloneDescriptorRecord(descriptors) : undefined;
	}
	if (!descriptors) {
		return cloneDescriptorRecord(fallback);
	}
	const merged: Record<string, SessionMetadataDescriptor> = {};
	const keys = new Set([...Object.keys(fallback), ...Object.keys(descriptors)]);
	for (const key of keys) {
		const descriptor = mergeDescriptor(descriptors[key], fallback[key]);
		if (descriptor) {
			merged[key] = descriptor;
		}
	}
	return merged;
}

export function mergeSessionMetadataForTranslation(
	sessionMetadata: SessionSnapshotMetadata,
	fallbackMetadata: SessionSnapshotMetadata,
): SessionSnapshotMetadata {
	const passiveEvaluationModifiers =
		sessionMetadata.passiveEvaluationModifiers ??
		fallbackMetadata.passiveEvaluationModifiers ??
		{};
	const effectLogs = sessionMetadata.effectLogs ?? fallbackMetadata.effectLogs;
	const merged: SessionSnapshotMetadata = {
		passiveEvaluationModifiers,
	};
	if (effectLogs) {
		merged.effectLogs = effectLogs;
	}
	const resources = mergeDescriptorRecords(
		sessionMetadata.resources,
		fallbackMetadata.resources,
	);
	if (resources !== undefined) {
		merged.resources = resources;
	}
	const populations = mergeDescriptorRecords(
		sessionMetadata.populations,
		fallbackMetadata.populations,
	);
	if (populations !== undefined) {
		merged.populations = populations;
	}
	const buildings = mergeDescriptorRecords(
		sessionMetadata.buildings,
		fallbackMetadata.buildings,
	);
	if (buildings !== undefined) {
		merged.buildings = buildings;
	}
	const developments = mergeDescriptorRecords(
		sessionMetadata.developments,
		fallbackMetadata.developments,
	);
	if (developments !== undefined) {
		merged.developments = developments;
	}
	const stats = mergeDescriptorRecords(
		sessionMetadata.stats,
		fallbackMetadata.stats,
	);
	if (stats !== undefined) {
		merged.stats = stats;
	}
	const phases = sessionMetadata.phases ?? fallbackMetadata.phases;
	if (phases !== undefined) {
		merged.phases = phases;
	}
	const triggers = sessionMetadata.triggers ?? fallbackMetadata.triggers;
	if (triggers !== undefined) {
		merged.triggers = triggers;
	}
	const assets = mergeDescriptorRecords(
		sessionMetadata.assets,
		fallbackMetadata.assets,
	);
	if (assets !== undefined) {
		merged.assets = assets;
	}
	const overview = sessionMetadata.overview ?? fallbackMetadata.overview;
	if (overview !== undefined) {
		merged.overview = overview;
	}
	return merged;
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
		const metadataPayload = mergeSessionMetadataForTranslation(
			sessionMetadata,
			fallbackMetadata,
		);
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
