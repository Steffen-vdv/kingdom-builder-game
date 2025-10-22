import type { Action } from './actionTypes';
import { formatActionTitle } from '../utils/formatActionTitle';
import { getActionCategoryId } from '../utils/actionCategory';

const ACTION_PREFIX_PATTERN = /^action\s*-\s*/iu;
const SEGMENT_DELIMITER_PATTERN = /\s*-\s*/u;

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
	if (ACTION_PREFIX_PATTERN.test(normalizedHeadline)) {
		const remainder = normalizedHeadline
			.replace(ACTION_PREFIX_PATTERN, '')
			.trim();
		if (remainder) {
			const segments = remainder
				.split(SEGMENT_DELIMITER_PATTERN)
				.map((segment) => segment.trim())
				.filter(Boolean);
			normalizedHeadline = segments[segments.length - 1] ?? remainder;
		} else {
			normalizedHeadline = remainder;
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
	const trimmedHeadline = normalizedHeadline.trim();
	return trimmedHeadline || fallback;
}

function buildResolutionActionMeta(
	action: Action,
	stepDef: { icon?: unknown; name?: unknown; category?: unknown } | undefined,
	headline: string | undefined,
	category?: { icon?: unknown; title?: unknown },
) {
	const actionIcon =
		typeof stepDef?.icon === 'string' ? stepDef.icon : undefined;
	const fallbackName =
		typeof stepDef?.name === 'string' ? stepDef.name.trim() : '';
	const resolvedFallback = fallbackName || action.name;
	const categoryId = getActionCategoryId(stepDef);
	const categoryIcon =
		typeof category?.icon === 'string' ? category.icon : undefined;
	const categoryTitle =
		typeof category?.title === 'string' ? category.title : categoryId;
	const actionTitle = deriveResolutionActionName(
		headline,
		resolvedFallback,
		actionIcon,
	);
	const titleOptions = {
		actionTitle,
	} as {
		categoryIcon?: string;
		categoryTitle?: string;
		actionIcon?: string;
		actionTitle: string;
	};
	if (typeof categoryIcon !== 'undefined') {
		titleOptions.categoryIcon = categoryIcon;
	}
	if (typeof categoryTitle !== 'undefined') {
		titleOptions.categoryTitle = categoryTitle;
	}
	if (typeof actionIcon !== 'undefined') {
		titleOptions.actionIcon = actionIcon;
	}
	const formattedTitle = formatActionTitle(titleOptions);
	return {
		id: action.id,
		name: formattedTitle,
		...(actionIcon ? { icon: actionIcon } : {}),
	};
}

export { buildResolutionActionMeta, deriveResolutionActionName };
