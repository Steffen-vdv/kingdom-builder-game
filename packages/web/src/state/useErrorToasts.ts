import { useCallback, useRef, useState } from 'react';

export type ErrorToast = {
	id: number;
	message: string;
};

interface UseErrorToastsOptions {
	setTrackedTimeout: (callback: () => void, delay: number) => number;
}

export function useErrorToasts({ setTrackedTimeout }: UseErrorToastsOptions) {
	const nextToastId = useRef(0);
	const [errorToasts, setErrorToasts] = useState<ErrorToast[]>([]);

	const dismissErrorToast = useCallback((id: number) => {
		setErrorToasts((prev) => prev.filter((toast) => toast.id !== id));
	}, []);

	const pushErrorToast = useCallback(
		(message: string) => {
			const id = nextToastId.current++;
			const trimmed = message.trim();
			const normalized = trimmed || 'Action failed';
			setErrorToasts((prev) => [...prev, { id, message: normalized }]);
			setTrackedTimeout(() => {
				dismissErrorToast(id);
			}, 5000);
		},
		[dismissErrorToast, setTrackedTimeout],
	);

	return { errorToasts, pushErrorToast, dismissErrorToast };
}
