import type { EngineContext } from '../context';
import type { StatSourceFrame } from './types';

export function withStatSourceFrames<T>(
	context: EngineContext,
	frameDefinitions: StatSourceFrame | StatSourceFrame[] | undefined,
	execute: () => T,
): T {
	const frameList = Array.isArray(frameDefinitions)
		? frameDefinitions
		: frameDefinitions
			? [frameDefinitions]
			: [];
	for (const frame of frameList) {
		context.statSourceStack.push(frame);
	}
	try {
		return execute();
	} finally {
		for (let index = 0; index < frameList.length; index += 1) {
			context.statSourceStack.pop();
		}
	}
}
