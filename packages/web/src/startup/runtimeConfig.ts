export interface RuntimeConfiguration {
	primaryResourceKey?: string | null;
}

declare global {
	interface Window {
		__KINGDOM_BUILDER_CONFIG__?: RuntimeConfiguration;
	}
}

const readGlobalRuntimeConfig = (): RuntimeConfiguration | undefined => {
	if (typeof window === 'undefined') {
		return undefined;
	}
	return window.__KINGDOM_BUILDER_CONFIG__;
};

export function readRuntimeConfiguration(): RuntimeConfiguration {
	const config = readGlobalRuntimeConfig();
	if (!config) {
		return {};
	}
	return { ...config };
}
