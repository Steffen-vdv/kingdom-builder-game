export function humanizeIdentifier(identifier: string | undefined): string {
	if (typeof identifier !== 'string' || identifier.length === 0) {
		return '';
	}
	const terminal = identifier.split(':').pop() ?? identifier;
	const separated = terminal
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
	const tokens = separated
		.split(/[\s-_]+/)
		.map((part) => part.trim())
		.filter((part) => part.length > 0);
	if (tokens.length === 0) {
		return terminal;
	}
	return tokens
		.map((token) => token.charAt(0).toUpperCase() + token.slice(1))
		.join(' ');
}
