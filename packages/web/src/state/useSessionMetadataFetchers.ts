import { useMemo } from 'react';
import type { SessionMetadataFetchers } from './GameContext.types';
import type { SessionRuleSnapshot, SessionSnapshot } from './sessionTypes';
import type { TranslationContext } from '../translation/context';
import type { SessionView } from './sessionSelectors';

interface UseSessionMetadataOptions {
	ruleSnapshot: SessionRuleSnapshot;
	sessionView: SessionView;
	translationContext: TranslationContext | null;
	sessionMetadata?: SessionSnapshot['metadata'];
	cachedMetadata: SessionSnapshot['metadata'];
}

export function useSessionMetadataFetchers({
	ruleSnapshot,
	sessionView,
	translationContext,
	sessionMetadata,
	cachedMetadata,
}: UseSessionMetadataOptions): {
	metadataSnapshot: SessionSnapshot['metadata'];
	metadata: SessionMetadataFetchers;
} {
	const metadataSnapshot = useMemo(
		() => sessionMetadata ?? cachedMetadata,
		[sessionMetadata, cachedMetadata],
	);

	const metadata = useMemo<SessionMetadataFetchers>(
		() => ({
			getRuleSnapshot: () => ruleSnapshot,
			getSessionView: () => sessionView,
			getTranslationContext: () => {
				if (!translationContext) {
					throw new Error('Translation context unavailable');
				}
				return translationContext;
			},
		}),
		[ruleSnapshot, sessionView, translationContext],
	);

	return { metadataSnapshot, metadata };
}
