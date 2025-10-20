const isAbortError = (error: unknown): boolean => {
	if (typeof DOMException === 'function' && error instanceof DOMException) {
		return error.name === 'AbortError';
	}
	if (typeof error !== 'object' || error === null) {
		return false;
	}
	const name = (error as { readonly name?: unknown }).name;
	return name === 'AbortError';
};

export { isAbortError };
