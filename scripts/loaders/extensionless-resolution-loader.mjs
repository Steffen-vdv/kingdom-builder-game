export async function resolve(specifier, context, nextResolve) {
	try {
		return await nextResolve(specifier, context);
	} catch (error) {
		if (!shouldAttemptFallback(specifier, error)) {
			throw error;
		}
		const candidates = createFallbackSpecifiers(specifier);
		for (const candidate of candidates) {
			try {
				return await nextResolve(candidate, context);
			} catch (candidateError) {
				if (!isRecoverable(candidateError)) {
					throw candidateError;
				}
			}
		}
		throw error;
	}
}

function shouldAttemptFallback(specifier, error) {
	if (
		error &&
		error.code !== 'ERR_MODULE_NOT_FOUND' &&
		error.code !== 'ERR_UNSUPPORTED_DIR_IMPORT'
	) {
		return false;
	}
	return specifier.startsWith('./') || specifier.startsWith('../');
}

function createFallbackSpecifiers(specifier) {
	return [
		`${specifier}.js`,
		`${specifier}.mjs`,
		`${specifier}.cjs`,
		`${specifier}/index.js`,
		`${specifier}/index.mjs`,
		`${specifier}/index.cjs`,
	];
}

function isRecoverable(error) {
	if (!error) {
		return false;
	}
	return (
		error.code === 'ERR_MODULE_NOT_FOUND' ||
		error.code === 'ERR_UNSUPPORTED_DIR_IMPORT'
	);
}
