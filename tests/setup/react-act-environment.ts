declare global {
	interface Global {
		IS_REACT_ACT_ENVIRONMENT?: boolean;
	}
	interface Window {
		IS_REACT_ACT_ENVIRONMENT?: boolean;
	}
}

const ensureReactActEnvironment = () => {
	globalThis.IS_REACT_ACT_ENVIRONMENT = true;
	if (typeof window !== 'undefined') {
		window.IS_REACT_ACT_ENVIRONMENT = true;
	}
};

ensureReactActEnvironment();

if (typeof beforeEach === 'function') {
	beforeEach(() => {
		ensureReactActEnvironment();
	});
}

const reactActEnvironmentWarning =
	'The current testing environment is not configured to support act(...)';

const originalConsoleError = console.error.bind(console);

console.error = (...args: Parameters<typeof console.error>) => {
	if (
		typeof args[0] === 'string' &&
		args[0].includes(reactActEnvironmentWarning)
	) {
		return;
	}
	originalConsoleError(...args);
};
