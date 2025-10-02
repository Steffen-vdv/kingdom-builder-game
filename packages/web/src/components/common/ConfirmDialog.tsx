import React from 'react';
import Button from './Button';

const DIALOG_BACKDROP_CLASS = [
	'fixed inset-0 z-50 flex items-center justify-center',
	'bg-slate-900/70 backdrop-blur-sm',
].join(' ');

const DIALOG_PANEL_CLASS = [
	'mx-4 w-full max-w-lg rounded-3xl border border-white/30',
	'bg-white/80 p-6 text-slate-800',
	'shadow-2xl dark:border-white/10 dark:bg-slate-900/90',
	'dark:text-slate-100',
].join(' ');

const DIALOG_HEADER_CLASS = 'flex items-start justify-between gap-4';

const DIALOG_TITLE_CLASS = [
	'text-lg font-semibold tracking-tight text-slate-900',
	'dark:text-slate-100',
].join(' ');

const DIALOG_DESCRIPTION_CLASS = [
	'mt-3 space-y-2 text-sm text-slate-600',
	'dark:text-slate-300',
].join(' ');

const DIALOG_CLOSE_BUTTON_CLASS = [
	'inline-flex h-9 w-9 items-center justify-center rounded-full',
	'bg-white/70 text-slate-500 shadow-md transition',
	'hover:bg-white',
	'dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20',
].join(' ');

const DIALOG_ACTIONS_CLASS = [
	'mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end',
].join(' ');

const DIALOG_ACTION_BUTTON_CLASS = 'px-5 py-2.5 text-sm';

export interface ConfirmDialogAction {
	label: string;
	onClick: () => void;
	variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'dev';
}

interface ConfirmDialogProps {
	open: boolean;
	title: string;
	description: React.ReactNode;
	actions: ConfirmDialogAction[];
	onClose: () => void;
}

export default function ConfirmDialog({
	open,
	title,
	description,
	actions,
	onClose,
}: ConfirmDialogProps) {
	if (!open) {
		return null;
	}
	let renderedDescription: React.ReactNode;
	if (typeof description === 'string') {
		renderedDescription = <p>{description}</p>;
	} else {
		renderedDescription = description;
	}

	const headerTitle = <h2 className={DIALOG_TITLE_CLASS}>{title}</h2>;
	const headerDescription = (
		<div className={DIALOG_DESCRIPTION_CLASS}>{renderedDescription}</div>
	);
	const header = (
		<div className={DIALOG_HEADER_CLASS}>
			<div>
				{headerTitle}
				{headerDescription}
			</div>
			<button
				type="button"
				onClick={onClose}
				className={DIALOG_CLOSE_BUTTON_CLASS}
				aria-label="Close dialog"
			>
				×
			</button>
		</div>
	);

	const actionButtons = actions.map((action, index) => {
		const defaultVariant = index === 0 ? 'primary' : 'secondary';
		const resolvedVariant = action.variant ?? defaultVariant;
		const handleActionClick = () => {
			action.onClick();
			onClose();
		};
		const buttonProps = {
			key: action.label + index,
			variant: resolvedVariant,
			onClick: handleActionClick,
			className: DIALOG_ACTION_BUTTON_CLASS,
		} as const;
		return <Button {...buttonProps}>{action.label}</Button>;
	});

	return (
		<div className={DIALOG_BACKDROP_CLASS} role="dialog" aria-modal="true">
			<div className={DIALOG_PANEL_CLASS}>
				{header}
				<div className={DIALOG_ACTIONS_CLASS}>{actionButtons}</div>
			</div>
		</div>
	);
}
