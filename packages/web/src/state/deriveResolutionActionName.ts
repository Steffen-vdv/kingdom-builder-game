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
	stepDef: { icon?: unknown; name?: unknown } | undefined,
	headline: string | undefined,
) {
	const actionIcon =
		typeof stepDef?.icon === 'string' ? stepDef.icon : undefined;
	const fallbackName =
		typeof stepDef?.name === 'string' ? stepDef.name.trim() : '';
	const resolvedFallback = fallbackName || action.name;
	return {
		id: action.id,
		name: deriveResolutionActionName(headline, resolvedFallback, actionIcon),
		...(actionIcon ? { icon: actionIcon } : {}),
	};
}

export { buildResolutionActionMeta, deriveResolutionActionName };
