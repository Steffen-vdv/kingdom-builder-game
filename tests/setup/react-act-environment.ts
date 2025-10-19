const originalConsoleError = console.error;

console.error = (...args: unknown[]) => {
	if (
		typeof args[0] === 'string' &&
		args[0].includes(
			'The current testing environment is not configured to support act(...)',
		)
	) {
		return;
	}
	originalConsoleError(...(args as [unknown, ...unknown[]]));
};

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
