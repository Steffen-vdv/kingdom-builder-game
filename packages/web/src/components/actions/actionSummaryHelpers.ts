import type { Summary, TranslationContext } from '../../translation';
import { summarizeContent } from '../../translation';

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

export function summarizeActionWithInstallation(
	actionId: string,
	translationContext: TranslationContext,
): Summary {
	const baseSummary = summarizeContent('action', actionId, translationContext);
	const target = resolveInstallationTarget(actionId, translationContext);
	if (!target) {
		return baseSummary;
	}
	try {
		const installationSummary = summarizeContent(
			target.type,
			target.id,
			translationContext,
		);
		return installationSummary.length > 0 ? installationSummary : baseSummary;
	} catch {
		return baseSummary;
	}
}
