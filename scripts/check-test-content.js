const fs = require('fs');
const path = require('path');

function collectContentStrings() {
	const contentDir = path.join(__dirname, '..', 'packages', 'contents', 'src');
	const strings = new Set();
	const idRegex = /\.id\(\s*['"]([^'"\s]+)['"]\s*\)/g;
	const keyValRegex = /([A-Za-z0-9_-]+):\s*['"]\1['"]/g;

	function walk(dir) {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				walk(full);
			} else if (entry.isFile() && entry.name.endsWith('.ts')) {
				const text = fs.readFileSync(full, 'utf8');
				let matchResult;
				while ((matchResult = idRegex.exec(text)) !== null) {
					strings.add(matchResult[1]);
				}
				while ((matchResult = keyValRegex.exec(text)) !== null) {
					strings.add(matchResult[1]);
				}
			}
		}
	}

	walk(contentDir);
	return strings;
}

const FORBIDDEN = collectContentStrings();

function checkValue(value, node, context) {
	if (typeof value === 'string' && FORBIDDEN.has(value)) {
		context.report({
			node,
			message: `Forbidden content literal "${value}" found in test.`,
		});
	}
}

module.exports = {
	meta: {
		type: 'problem',
		docs: {
			description: 'disallow literals from contents in tests',
		},
	},
	create(context) {
		return {
			Literal(node) {
				checkValue(node.value, node, context);
			},
			TemplateLiteral(node) {
				for (const quasi of node.quasis) {
					checkValue(quasi.value.cooked, quasi, context);
				}
			},
		};
	},
};
