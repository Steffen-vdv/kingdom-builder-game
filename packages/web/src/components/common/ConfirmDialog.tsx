import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import Button from './Button';
import { ArrowLeftIcon, CheckIcon } from './icons';

interface ConfirmDialogProps {
	open: boolean;
	title: string;
	description: string;
	confirmLabel?: string;
	cancelLabel?: string;
	onConfirm: () => void;
	onCancel: () => void;
}

export default function ConfirmDialog({
	open,
	title,
	description,
	confirmLabel = 'Confirm',
	cancelLabel = 'Cancel',
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	useEffect(() => {
		if (!open || typeof window === 'undefined') {
			return;
		}
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				onCancel();
			}
			if (event.key === 'Enter') {
				event.preventDefault();
				onConfirm();
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [open, onCancel, onConfirm]);

	if (!open || typeof document === 'undefined') {
		return null;
	}

	return createPortal(
		<div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
			<div
				className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
				onClick={onCancel}
				aria-hidden
			/>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="confirm-dialog-title"
				className="relative z-10 w-full max-w-md rounded-3xl border border-white/20 bg-gradient-to-br from-white/95 via-white/90 to-white/80 p-8 text-slate-900 shadow-2xl shadow-slate-900/30 dark:border-white/10 dark:from-slate-900/95 dark:via-slate-900/90 dark:to-slate-900/80 dark:text-slate-100"
			>
				<div className="absolute -top-10 left-1/2 h-20 w-20 -translate-x-1/2 rounded-full bg-rose-400/30 blur-2xl dark:bg-rose-500/30" />
				<h2
					id="confirm-dialog-title"
					className="text-xl font-semibold tracking-tight"
				>
					{title}
				</h2>
				<p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
					{description}
				</p>
				<div className="mt-8 flex flex-wrap justify-end gap-3">
					<Button
						variant="ghost"
						onClick={onCancel}
						className="px-5"
						icon={<ArrowLeftIcon />}
					>
						{cancelLabel}
					</Button>
					<Button
						variant="danger"
						onClick={onConfirm}
						className="px-5"
						icon={<CheckIcon />}
					>
						{confirmLabel}
					</Button>
				</div>
			</div>
		</div>,
		document.body,
	);
}
