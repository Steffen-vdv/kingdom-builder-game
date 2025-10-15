import type { ReactElement } from 'react';

function normalizeIcon(icon: string | undefined): string | undefined {
	if (typeof icon !== 'string') {
		return undefined;
	}
	const trimmed = icon.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

export function renderIconLabel(
	icon: string | undefined,
	label: string,
): ReactElement {
	const normalized = normalizeIcon(icon);
	return (
		<span className="inline-flex items-center gap-1">
			{normalized ? <span>{normalized}</span> : null}
			<span>{label}</span>
		</span>
	);
}

export function formatIconTitle(
	icon: string | undefined,
	label: string,
): string {
	const normalized = normalizeIcon(icon);
	return [normalized, label].filter(Boolean).join(' ');
}
