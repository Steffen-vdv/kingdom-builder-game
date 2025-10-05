import { useCallback, useRef, useState } from 'react';

export type ToastVariant = 'error' | 'success';

export interface Toast {
	id: number;
	title: string;
	message: string;
	variant: ToastVariant;
}

interface PushToastOptions {
	message: string;
	title?: string;
	variant: ToastVariant;
}

interface UseToastsOptions {
	setTrackedTimeout: (callback: () => void, delay: number) => number;
}

const VARIANT_DEFAULTS: Record<
	ToastVariant,
	{ title: string; message: string }
> = {
	error: { title: 'Action failed', message: 'Action failed' },
	success: { title: 'Success', message: 'Done' },
};

export function useToasts({ setTrackedTimeout }: UseToastsOptions) {
	const nextToastId = useRef(0);
	const [toasts, setToasts] = useState<Toast[]>([]);

	const dismissToast = useCallback((id: number) => {
		setToasts((prev) => prev.filter((toast) => toast.id !== id));
	}, []);

	const pushToast = useCallback(
		({ message, title, variant }: PushToastOptions) => {
			const id = nextToastId.current++;
			const trimmedMessage = message.trim();
			const normalizedMessage =
				trimmedMessage || VARIANT_DEFAULTS[variant].message;
			const normalizedTitle = title?.trim() || VARIANT_DEFAULTS[variant].title;
			setToasts((prev) => [
				...prev,
				{ id, message: normalizedMessage, title: normalizedTitle, variant },
			]);
			setTrackedTimeout(() => {
				dismissToast(id);
			}, 5000);
		},
		[dismissToast, setTrackedTimeout],
	);

	const pushErrorToast = useCallback(
		(message: string, title?: string) =>
			pushToast({
				message,
				...(title ? { title } : {}),
				variant: 'error',
			}),
		[pushToast],
	);

	const pushSuccessToast = useCallback(
		(message: string, title?: string) =>
			pushToast({
				message,
				...(title ? { title } : {}),
				variant: 'success',
			}),
		[pushToast],
	);

	return { toasts, pushToast, pushErrorToast, pushSuccessToast, dismissToast };
}
