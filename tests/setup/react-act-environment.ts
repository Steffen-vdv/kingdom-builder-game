Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
	configurable: true,
	get() {
		return true;
	},
	set() {
		// Ignore attempts to change the act environment flag.
	},
});
