import type { Action } from './actionTypes';
import {
	formatActionDisplayTitle,
	normalizeActionCategoryDisplayInfo,
	normalizeActionDisplayInfo,
	type ActionCategoryDisplayInfo,
} from '../utils/formatActionDisplayTitle';

function stripLeadingIcon(value: string, icon?: string): string {
	const trimmedIcon = icon?.trim();
	if (!trimmedIcon) {
		return value;
	}
	const prefixed = `${trimmedIcon} `;
	if (value.startsWith(prefixed)) {
		const remainder = value.slice(prefixed.length).trim();
		return remainder || value;
	}
	if (value !== trimmedIcon && value.startsWith(trimmedIcon)) {
		const remainder = value.slice(trimmedIcon.length).trim();
		return remainder || value;
	}
	return value;
}

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
	const segments = normalizedHeadline
		.split(' - ')
		.map((segment) => segment.trim())
		.filter((segment) => segment.length > 0);
	if (segments.length === 0) {
		return stripLeadingIcon(normalizedHeadline, icon) || fallback;
	}
	const firstSegment = segments[0];
	if (firstSegment && firstSegment.toLowerCase() === 'action') {
		segments.shift();
	}
	const actionSegment = segments.pop();
	if (!actionSegment) {
		return stripLeadingIcon(normalizedHeadline, icon) || fallback;
	}
	const stripped = stripLeadingIcon(actionSegment, icon).trim();
	return stripped || fallback;
}

interface BuildResolutionActionMetaOptions {
	category?: ActionCategoryDisplayInfo;
}

interface ActionCategoryLookup {
	has(id: string): boolean;
	get(id: string): { icon?: string; title?: string };
}

function buildResolutionActionMeta(
	action: Action,
	stepDef: { icon?: unknown; name?: unknown } | undefined,
	headline: string | undefined,
	options: BuildResolutionActionMetaOptions = {},
) {
	const actionIcon =
		typeof stepDef?.icon === 'string' ? stepDef.icon : undefined;
	const fallbackName =
		typeof stepDef?.name === 'string' ? stepDef.name.trim() : '';
	const resolvedFallback = fallbackName || action.name;
	const normalizedName = deriveResolutionActionName(
		headline,
		resolvedFallback,
		actionIcon,
	);
	const displayInfo = normalizeActionDisplayInfo(actionIcon, normalizedName);
	const displayName = formatActionDisplayTitle(displayInfo, options.category);
	return {
		id: action.id,
		name: displayName,
		...(actionIcon ? { icon: actionIcon } : {}),
	};
}

export { buildResolutionActionMeta, deriveResolutionActionName };
function resolveResolutionActionCategoryOptions(
	stepDef: unknown,
	categories: ActionCategoryLookup,
): BuildResolutionActionMetaOptions {
	const rawCategoryId =
		typeof (stepDef as { category?: unknown })?.category === 'string'
			? (stepDef as { category: string }).category
			: undefined;
	if (!rawCategoryId || !categories.has(rawCategoryId)) {
		return {};
	}
	const definition = categories.get(rawCategoryId);
	const category = normalizeActionCategoryDisplayInfo(definition);
	return category ? { category } : {};
}

export type { BuildResolutionActionMetaOptions, ActionCategoryLookup };
export { resolveResolutionActionCategoryOptions };
