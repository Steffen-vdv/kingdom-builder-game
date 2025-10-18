export function humanizeIdentifier(identifier: string | undefined): string {
	if (!identifier) {
		return '';
	}
	const terminal = identifier.split(':').pop() ?? identifier;
	const camelSeparated = terminal.replace(/([a-z0-9])([A-Z])/gu, '$1 $2');
	const tokens = camelSeparated
		.split(/[-_\s]/u)
		.map((part) => part.trim())
		.filter((part) => part.length > 0);
	if (tokens.length === 0) {
		return terminal;
	}
	return tokens
		.map((token) => token.charAt(0).toUpperCase() + token.slice(1))
		.join(' ');
}
