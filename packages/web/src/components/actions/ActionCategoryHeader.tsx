import React from 'react';
import {
	TAB_HEADER_CLASSES,
	TAB_ICON_CLASSES,
	TAB_LABEL_CLASSES,
} from './actionsPanelStyles';

export interface ActionCategoryDescriptor {
	icon?: React.ReactNode;
	label: string;
	subtitle: string;
}

interface ActionCategoryHeaderProps {
	descriptor: ActionCategoryDescriptor;
	counts?: { performable: number; total: number };
}

/**
 * Returns color classes for the performable count based on availability:
 * - Green when all actions are performable (X == Y)
 * - Orange when no actions are performable (X == 0)
 * - Yellow when some actions are performable (0 < X < Y)
 */
function getCountColorClasses(performable: number, total: number): string {
	const baseClasses = 'text-xs font-semibold tracking-wide';
	if (total === 0) {
		// No actions in category - use neutral
		return `${baseClasses} text-slate-500 dark:text-slate-400`;
	}
	if (performable === total) {
		// All performable - green
		return `${baseClasses} text-emerald-600 dark:text-emerald-300`;
	}
	if (performable === 0) {
		// None performable - orange
		return `${baseClasses} text-orange-500 dark:text-orange-300`;
	}
	// Some performable - yellow
	return `${baseClasses} text-amber-600 dark:text-amber-300`;
}

export default function ActionCategoryHeader({
	descriptor,
	counts,
}: ActionCategoryHeaderProps) {
	const { icon, label } = descriptor;
	const performable = counts?.performable ?? 0;
	const total = counts?.total ?? 0;
	return (
		<span className={TAB_HEADER_CLASSES}>
			{icon ? (
				<span aria-hidden className={TAB_ICON_CLASSES}>
					{icon}
				</span>
			) : null}
			<span className="flex flex-col text-left">
				<span className={TAB_LABEL_CLASSES}>{label}</span>
				<span
					className={getCountColorClasses(performable, total)}
					aria-label={`${performable} of ${total} actions performable`}
				>
					{performable}/{total} performable
				</span>
			</span>
		</span>
	);
}
