import type { SessionSnapshot } from '@kingdom-builder/protocol';
import { buildSessionMetadata } from '../content/buildSessionMetadata.js';

type SessionMetadataBundle = ReturnType<typeof buildSessionMetadata>;
type SessionSnapshotMetadata = SessionSnapshot['metadata'];

export class SessionMetadataEnricher {
	private cachedBundle: SessionMetadataBundle | undefined;

	public enrich(snapshot: SessionSnapshot): SessionSnapshot {
		const bundle = this.getBundle();
		const mergedMetadata = this.mergeSnapshotMetadata(
			snapshot.metadata,
			bundle,
		);
		if (mergedMetadata === snapshot.metadata) {
			return snapshot;
		}
		return {
			...snapshot,
			metadata: mergedMetadata,
		};
	}

	private getBundle(): SessionMetadataBundle {
		if (!this.cachedBundle) {
			this.cachedBundle = buildSessionMetadata();
		}
		return this.cachedBundle;
	}

	private mergeSnapshotMetadata(
		metadata: SessionSnapshotMetadata,
		additions: SessionMetadataBundle,
	): SessionSnapshotMetadata {
		const resources = this.mergeRecords(
			metadata.resources,
			additions.resources,
		);
		const populations = this.mergeRecords(
			metadata.populations,
			additions.populations,
		);
		const buildings = this.mergeRecords(
			metadata.buildings,
			additions.buildings,
		);
		const developments = this.mergeRecords(
			metadata.developments,
			additions.developments,
		);
		const stats = this.mergeRecords(metadata.stats, additions.stats);
		const phases = this.mergeRecords(metadata.phases, additions.phases);
		const triggers = this.mergeRecords(metadata.triggers, additions.triggers);
		const assets = this.mergeRecords(metadata.assets, additions.assets);
		const developerPresetPlan =
			metadata.developerPresetPlan ?? additions.developerPresetPlan;

		if (
			resources === metadata.resources &&
			populations === metadata.populations &&
			buildings === metadata.buildings &&
			developments === metadata.developments &&
			stats === metadata.stats &&
			phases === metadata.phases &&
			triggers === metadata.triggers &&
			assets === metadata.assets &&
			developerPresetPlan === metadata.developerPresetPlan
		) {
			return metadata;
		}

		const updated: SessionSnapshotMetadata = { ...metadata };

		const assign = <K extends keyof SessionSnapshotMetadata>(
			key: K,
			value: SessionSnapshotMetadata[K],
		): void => {
			if (value === undefined) {
				delete updated[key];
				return;
			}
			updated[key] = value;
		};

		assign('resources', resources);
		assign('populations', populations);
		assign('buildings', buildings);
		assign('developments', developments);
		assign('stats', stats);
		assign('phases', phases);
		assign('triggers', triggers);
		assign('assets', assets);
		assign('developerPresetPlan', developerPresetPlan);

		return updated;
	}

	private mergeRecords<TRecord extends Record<string, unknown>>(
		base: TRecord | undefined,
		additions: TRecord | undefined,
	): TRecord | undefined {
		if (!additions) {
			return base;
		}
		if (!base) {
			return additions;
		}
		return { ...additions, ...base };
	}
}
