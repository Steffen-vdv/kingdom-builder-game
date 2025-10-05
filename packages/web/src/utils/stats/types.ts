import type { EngineContext, StatSourceLink } from '@kingdom-builder/engine';

export type ResolveResult = { icon: string; label: string };

export type SourceDescriptor = ResolveResult & {
	suffix?: ResolveResult;
	kind?: string;
};

export type DescriptorRegistryEntry = {
	resolve(id?: string): ResolveResult;
	formatDetail?: (
		id: string | undefined,
		detail: string | undefined,
	) => string | undefined;
	augmentDependencyDetail?: (
		detail: string | undefined,
		link: StatSourceLink,
		player: EngineContext['activePlayer'],
		context: EngineContext,
		options: { includeCounts?: boolean },
	) => string | undefined;
	formatDependency?: (
		link: StatSourceLink,
		player: EngineContext['activePlayer'],
		context: EngineContext,
		options: { includeCounts?: boolean },
	) => string;
};
