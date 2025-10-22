import type { Action } from './actionTypes';
import type { ResolutionActionMeta } from './useActionResolution.types';
import type { ResolvedActionCategory } from '../utils/resolveActionCategory';

type ResolutionActionCategory = ResolvedActionCategory;

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
	if (normalizedHeadline.startsWith('Action -')) {
		const segments = normalizedHeadline
			.split(' - ')
			.map((segment) => segment.trim())
			.filter((segment) => segment.length > 0);
		if (segments.length >= 2) {
			normalizedHeadline = segments[segments.length - 1] ?? normalizedHeadline;
		}
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
	stepDef: { icon?: unknown; name?: unknown; category?: unknown } | undefined,
	headline: string | undefined,
	categoryDef?: ResolutionActionCategory,
): ResolutionActionMeta {
	const actionIcon =
		typeof stepDef?.icon === 'string' ? stepDef.icon : undefined;
	const fallbackName =
		typeof stepDef?.name === 'string' ? stepDef.name.trim() : '';
	const resolvedFallback = fallbackName || action.name;
	const meta: ResolutionActionMeta = {
		id: action.id,
		name: deriveResolutionActionName(headline, resolvedFallback, actionIcon),
	};
	if (actionIcon) {
		meta.icon = actionIcon;
	}
	const categoryId =
		typeof stepDef?.category === 'string' ? stepDef.category : undefined;
	const resolvedCategoryId =
		typeof categoryDef?.id === 'string' ? categoryDef.id : categoryId;
	if (resolvedCategoryId) {
		meta.categoryId = resolvedCategoryId;
	}
	if (categoryDef?.title) {
		meta.categoryTitle = categoryDef.title;
	}
	if (categoryDef?.icon) {
		meta.categoryIcon = categoryDef.icon;
	}
	return meta;
}

export { buildResolutionActionMeta, deriveResolutionActionName };
export type { ResolutionActionCategory };
