import type { EngineContext } from '../context';
import type { ResourceSourceFrame } from './types';

export function withResourceSourceFrames<T>(
	context: EngineContext,
	frameDefinitions: ResourceSourceFrame | ResourceSourceFrame[] | undefined,
	execute: () => T,
): T {
	const frameList = Array.isArray(frameDefinitions)
		? frameDefinitions
		: frameDefinitions
			? [frameDefinitions]
			: [];
	for (const frame of frameList) {
		context.resourceSourceStack.push(frame);
	}
	try {
		return execute();
	} finally {
		for (let index = 0; index < frameList.length; index += 1) {
			context.resourceSourceStack.pop();
		}
	}
}
