interface ActionCategoryDisplayInfo {
	title?: string;
	icon?: string;
}

interface ActionDisplayInfo {
	name?: string;
	icon?: string;
}

function joinLabelParts(parts: (string | undefined)[]): string {
	return parts
		.map((part) => part?.trim() ?? '')
		.filter((part) => part.length > 0)
		.join(' ')
		.trim();
}

export function formatActionDisplayTitle(
	action: ActionDisplayInfo,
	category?: ActionCategoryDisplayInfo,
): string {
	const segments: string[] = ['Action'];
	const categoryLabel = joinLabelParts([category?.icon, category?.title]);
	if (categoryLabel.length > 0) {
		segments.push(categoryLabel);
	}
	const fallbackActionName = (action.name ?? '').trim() || 'Unknown action';
	const actionLabel = joinLabelParts([action.icon, fallbackActionName]);
	segments.push(actionLabel);
	return segments.join(' - ');
}

export function normalizeActionCategoryDisplayInfo(
	value: unknown,
): ActionCategoryDisplayInfo | undefined {
	if (typeof value !== 'object' || value === null) {
		return undefined;
	}
	const candidate = value as {
		icon?: unknown;
		title?: unknown;
	};
	const icon =
		typeof candidate.icon === 'string' && candidate.icon.trim().length > 0
			? candidate.icon
			: undefined;
	const title =
		typeof candidate.title === 'string' && candidate.title.trim().length > 0
			? candidate.title
			: undefined;
	if (!icon && !title) {
		return undefined;
	}
	const info: ActionCategoryDisplayInfo = {};
	if (icon) {
		info.icon = icon;
	}
	if (title) {
		info.title = title;
	}
	return info;
}

export function normalizeActionDisplayInfo(
	icon: unknown,
	name: unknown,
): ActionDisplayInfo {
	const info: ActionDisplayInfo = {};
	if (typeof icon === 'string') {
		const trimmedIcon = icon.trim();
		if (trimmedIcon.length > 0) {
			info.icon = trimmedIcon;
		}
	}
	if (typeof name === 'string') {
		const trimmedName = name.trim();
		if (trimmedName.length > 0) {
			info.name = trimmedName;
		}
	}
	return info;
}

export type { ActionCategoryDisplayInfo, ActionDisplayInfo };
