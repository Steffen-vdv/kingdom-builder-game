import type {
	SessionPlayerStateSnapshot as PlayerStateSnapshot,
	SessionStatSourceLink as StatSourceLink,
} from '@kingdom-builder/protocol';
import type { TranslationContext } from '../../translation/context';

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
		player: PlayerStateSnapshot,
		context: TranslationContext,
		options: { includeCounts?: boolean },
	) => string | undefined;
	formatDependency?: (
		link: StatSourceLink,
		player: PlayerStateSnapshot,
		context: TranslationContext,
		options: { includeCounts?: boolean },
	) => string;
};
