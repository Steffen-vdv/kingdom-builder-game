import type { EngineSession } from '@kingdom-builder/engine';

export type LegacySessionContext =
	EngineSession['getLegacyContext'] extends () => infer T ? T : never;

let legacyContextCache = new WeakMap<EngineSession, LegacySessionContext>();

export function getLegacySessionContext(
	session: EngineSession,
): LegacySessionContext {
	const cached = legacyContextCache.get(session);
	if (cached) {
		return cached;
	}
	const context = session.getLegacyContext();
	legacyContextCache.set(session, context);
	return context;
}

export function clearLegacySessionContextCache() {
	legacyContextCache = new WeakMap();
}
