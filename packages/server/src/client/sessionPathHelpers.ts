function normalizePathSegment(path: string): string {
	return path.startsWith('/') ? path.slice(1) : path;
}

function isNonEmpty(value: string | undefined): value is string {
	return typeof value === 'string' && value.length > 0;
}

export function encodeSessionId(sessionId: string): string {
	return encodeURIComponent(sessionId);
}

export function encodeActionId(actionId: string): string {
	return encodeURIComponent(actionId);
}

export function normalizeRequestPath(path: string): string {
	return normalizePathSegment(path);
}

export function createSessionDetailPath(
	sessionId: string,
	suffix: string,
	actionId: string | undefined,
): string {
	const normalizedSuffix = normalizePathSegment(suffix);
	const sessionPath = `sessions/${encodeSessionId(sessionId)}`;
	if (isNonEmpty(actionId)) {
		const encodedActionId = encodeActionId(actionId);
		if (normalizedSuffix.startsWith('actions/')) {
			const remainder = normalizedSuffix.slice('actions/'.length);
			return remainder
				? `${sessionPath}/actions/${encodedActionId}/${remainder}`
				: `${sessionPath}/actions/${encodedActionId}`;
		}
		return normalizedSuffix
			? `${sessionPath}/actions/${encodedActionId}/${normalizedSuffix}`
			: `${sessionPath}/actions/${encodedActionId}`;
	}
	return normalizedSuffix ? `${sessionPath}/${normalizedSuffix}` : sessionPath;
}
