import React from 'react';
import {
	TAB_HEADER_CLASSES,
	TAB_ICON_CLASSES,
	TAB_LABEL_CLASSES,
	TAB_COUNT_CLASSES,
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
					className={TAB_COUNT_CLASSES}
					aria-label={`${performable} of ${total} actions performable`}
				>
					{performable}/{total} performable
				</span>
			</span>
		</span>
	);
}
