import type { TranslationContext } from '../translation/context';
import {
	formatActionTitle,
	type ActionTitleDefinition,
} from '../translation/formatActionTitle';
import type { Action } from './actionTypes';

function deriveResolutionActionName(
	headline: string | undefined,
	fallback: string,
	icon?: string,
): string {
	let normalizedHeadline = headline?.trim() ?? '';
	if (!normalizedHeadline) {
		return fallback;
	}
	if (normalizedHeadline.startsWith('Played ')) {
		normalizedHeadline = normalizedHeadline.slice(7).trim();
	}
	const trimmedIcon = icon?.trim();
	if (trimmedIcon) {
		const prefixed = `${trimmedIcon} `;
		if (normalizedHeadline.startsWith(prefixed)) {
			const remainder = normalizedHeadline.slice(prefixed.length).trim();
			return remainder || fallback;
		}
		if (
			normalizedHeadline !== trimmedIcon &&
			normalizedHeadline.startsWith(trimmedIcon)
		) {
			const remainder = normalizedHeadline.slice(trimmedIcon.length).trim();
			return remainder || fallback;
		}
	}
	return normalizedHeadline;
}

function buildResolutionActionMeta(
	action: Action,
	stepDef: ActionTitleDefinition | undefined,
	headline: string | undefined,
	context?: TranslationContext,
) {
	const actionIcon =
		typeof stepDef?.icon === 'string' ? stepDef.icon : undefined;
	let formattedName: string | undefined;
	if (stepDef && context) {
		try {
			formattedName = formatActionTitle(stepDef, context, {
				includePrefix: false,
			});
		} catch {
			formattedName = undefined;
		}
	}
	const fallbackName =
		typeof stepDef?.name === 'string' ? stepDef.name.trim() : '';
	const resolvedFallback = fallbackName || action.name;
	const resolvedName =
		formattedName ??
		deriveResolutionActionName(headline, resolvedFallback, actionIcon);
	return {
		id: action.id,
		name: resolvedName,
		...(actionIcon ? { icon: actionIcon } : {}),
	};
}

export { buildResolutionActionMeta, deriveResolutionActionName };
