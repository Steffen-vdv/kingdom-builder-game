'use strict';

const MESSAGE_ID = 'noOverride';

module.exports = {
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow overriding the max-lines rule via ESLint directives.',
		},
		schema: [],
		messages: {
			[MESSAGE_ID]:
				'Do not override max-lines via ESLint comments. Split the file instead.',
		},
	},
	create(context) {
		const source = context.getSourceCode();
		return {
			Program() {
				for (const comment of source.getAllComments()) {
					const value = comment.value;
					if (
						/^\s*eslint(?:-disable|-enable|-config|-env)?/.test(value) &&
						/\bmax-lines\b/.test(value)
					) {
						context.report({
							loc: comment.loc,
							messageId: MESSAGE_ID,
						});
					}
				}
			},
		};
	},
};
