import type { Summary, TranslationContext } from '../../translation';
import { summarizeContent, describeContent } from '../../translation';

type InstallationTargetType = 'building' | 'development';

export interface InstallationTarget {
	type: InstallationTargetType;
	id: string;
}

type EffectLike = {
	type?: string;
	method?: string;
	params?: Record<string, unknown> | undefined;
	effects?: unknown;
};

type ActionDefinitionLike = {
	effects?: unknown;
	steps?: unknown;
};

function resolveInstallationId(params: Record<string, unknown> | undefined) {
	if (!params) {
		return undefined;
	}
	const id = params['id'];
	if (typeof id === 'string' && id.trim().length > 0) {
		return id;
	}
	const developmentId = params['developmentId'];
	if (typeof developmentId === 'string' && developmentId.trim().length > 0) {
		return developmentId;
	}
	const buildingId = params['buildingId'];
	if (typeof buildingId === 'string' && buildingId.trim().length > 0) {
		return buildingId;
	}
	return undefined;
}

function findInstallationTarget(
	entries: unknown,
): InstallationTarget | undefined {
	if (!Array.isArray(entries)) {
		return undefined;
	}
	for (const entry of entries) {
		if (!entry || typeof entry !== 'object') {
			continue;
		}
		const effect = entry as EffectLike;
		const { type, method } = effect;
		const params = effect.params;
		if (type === 'building' && method === 'add') {
			const id = resolveInstallationId(params);
			if (id) {
				return { type: 'building', id };
			}
		}
		if (type === 'development' && method === 'add') {
			const id = resolveInstallationId(params);
			if (id) {
				return { type: 'development', id };
			}
		}
		const nested = findInstallationTarget(effect.effects);
		if (nested) {
			return nested;
		}
	}
	return undefined;
}

export function resolveInstallationTarget(
	actionId: string,
	translationContext: TranslationContext,
): InstallationTarget | undefined {
	try {
		const definition = translationContext.actions.get(
			actionId,
		) as ActionDefinitionLike;
		const direct = findInstallationTarget(definition.effects);
		if (direct) {
			return direct;
		}
		if (Array.isArray(definition.steps)) {
			for (const step of definition.steps) {
				if (!step || typeof step !== 'object') {
					continue;
				}
				const candidate = findInstallationTarget(
					(
						step as {
							effects?: unknown;
						}
					).effects,
				);
				if (candidate) {
					return candidate;
				}
			}
		}
	} catch {
		return undefined;
	}
	return undefined;
}

/**
 * Combines slot transformation with development effects.
 * Structure:
 *   • 🧩 → 🌾
 *     • 🪙 +2 per 🌱 Growth Phase
 */
export function summarizeActionWithInstallation(
	actionId: string,
	translationContext: TranslationContext,
	currentTier?: number,
): Summary {
	const actionOptions =
		typeof currentTier === 'number' ? { currentTier } : undefined;
	const baseSummary = summarizeContent(
		'action',
		actionId,
		translationContext,
		actionOptions,
	);
	const target = resolveInstallationTarget(actionId, translationContext);
	if (!target) {
		return baseSummary;
	}
	try {
		// Get development effects without the "On build, until removed" wrapper
		const installationSummary = summarizeContent(
			target.type,
			target.id,
			translationContext,
			{ omitTriggerTitle: true },
		);
		if (installationSummary.length === 0) {
			return baseSummary;
		}
		// Get the slot transformation from the action summary (first entry)
		// The action summary contains the `development:add` effect which renders
		// as "🧩 → 🌾"
		const transformation = baseSummary[0];
		if (typeof transformation !== 'string') {
			// Unexpected structure, fall back to installation summary
			return installationSummary;
		}
		// Combine: transformation as parent, development effects as children
		return [
			{
				title: transformation,
				items: installationSummary,
			},
		];
	} catch {
		return baseSummary;
	}
}

/**
 * Combines slot transformation with development effects for describe mode.
 * Structure:
 *   • 🧩 Empty Development Slot → 🌾 Farm
 *     • Gain 🪙 +2 Gold each 🌱 Growth Phase
 */
export function describeActionWithInstallation(
	actionId: string,
	translationContext: TranslationContext,
	currentTier?: number,
): Summary {
	const actionOptions =
		typeof currentTier === 'number' ? { currentTier } : undefined;
	const baseDescription = describeContent(
		'action',
		actionId,
		translationContext,
		actionOptions,
	);
	const target = resolveInstallationTarget(actionId, translationContext);
	if (!target) {
		return baseDescription;
	}
	try {
		// Get development effects without the "On build, until removed" wrapper
		const installationDescription = describeContent(
			target.type,
			target.id,
			translationContext,
			{ omitTriggerTitle: true },
		);
		if (installationDescription.length === 0) {
			return baseDescription;
		}
		// Get the slot transformation from the action description (first entry)
		// The action description contains the `development:add` effect which renders
		// as "🧩 Empty Development Slot → 🌾 Farm"
		const transformation = baseDescription[0];
		if (typeof transformation !== 'string') {
			// Unexpected structure, fall back to installation description
			return installationDescription;
		}
		// Combine: transformation as parent, development effects as children
		return [
			{
				title: transformation,
				items: installationDescription,
			},
		];
	} catch {
		return baseDescription;
	}
}
