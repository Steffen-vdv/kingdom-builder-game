const needsExtension = (specifier) =>
	(specifier.startsWith('./') || specifier.startsWith('../')) &&
	!specifier.endsWith('.js');

async function tryResolve(specifier, context, defaultResolve) {
	try {
		return await defaultResolve(specifier, context, defaultResolve);
	} catch (error) {
		if (error.code === 'ERR_MODULE_NOT_FOUND') {
			return null;
		}
		if (error.code === 'ERR_UNSUPPORTED_DIR_IMPORT') {
			return null;
		}
		throw error;
	}
}

export async function resolve(specifier, context, defaultResolve) {
	if (needsExtension(specifier)) {
		const direct = await tryResolve(`${specifier}.js`, context, defaultResolve);
		if (direct) {
			return direct;
		}
		const index = await tryResolve(
			`${specifier}/index.js`,
			context,
			defaultResolve,
		);
		if (index) {
			return index;
		}
	}
	return defaultResolve(specifier, context, defaultResolve);
}
