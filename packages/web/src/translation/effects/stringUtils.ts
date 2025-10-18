export function humanizeIdentifier(identifier: string | undefined): string {
	if (!identifier) {
		return '';
	}
	const terminal = identifier.split(':').pop() ?? identifier;
	const tokens = terminal.split(/[-_]/).flatMap((part) => {
		const trimmed = part.trim();
		if (trimmed.length === 0) {
			return [];
		}
		return trimmed
			.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
			.split(' ')
			.map((segment) => segment.trim())
			.filter((segment) => segment.length > 0);
	});
	if (tokens.length === 0) {
		return terminal;
	}
	return tokens
		.map((token) => token.charAt(0).toUpperCase() + token.slice(1))
		.join(' ');
}
