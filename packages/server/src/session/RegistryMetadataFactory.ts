import {
	RESOURCES,
	TRIGGER_INFO,
	OVERVIEW_CONTENT,
} from '@kingdom-builder/contents';
import type {
	SessionMetadataDescriptor,
	SessionOverviewContent,
	SessionSnapshotMetadata,
	SessionTriggerMetadata,
} from '@kingdom-builder/protocol';

export type RegistryMetadata = Partial<SessionSnapshotMetadata>;

interface TriggerMetadataSource {
	icon?: string;
	future?: string;
	past?: string;
}

const clone = <T>(value: T): T => structuredClone(value);

function buildResourceMetadata(): Record<string, SessionMetadataDescriptor> {
	const entries: [string, SessionMetadataDescriptor][] = [];
	for (const info of Object.values(RESOURCES)) {
		entries.push([
			info.key,
			{
				label: info.label,
				icon: info.icon,
				description: info.description,
			},
		]);
	}
	return Object.fromEntries(entries);
}

function buildTriggerMetadata(): Record<string, SessionTriggerMetadata> {
	const entries: [string, SessionTriggerMetadata][] = [];
	const triggers = TRIGGER_INFO as Record<string, TriggerMetadataSource>;
	for (const [triggerId, info] of Object.entries(triggers)) {
		const id = String(triggerId);
		const descriptor: SessionTriggerMetadata = {
			label: info.past ?? info.future ?? id,
		};
		if (info.icon !== undefined) {
			descriptor.icon = info.icon;
		}
		if (info.future !== undefined) {
			descriptor.future = info.future;
		}
		if (info.past !== undefined) {
			descriptor.past = info.past;
		}
		entries.push([id, descriptor]);
	}
	return Object.fromEntries(entries);
}

function buildOverviewContent(): SessionOverviewContent {
	return {
		hero: clone(OVERVIEW_CONTENT.hero),
	} satisfies SessionOverviewContent;
}

export function createRegistryMetadata(): RegistryMetadata {
	return {
		resources: buildResourceMetadata(),
		triggers: buildTriggerMetadata(),
		overviewContent: buildOverviewContent(),
	} satisfies RegistryMetadata;
}
