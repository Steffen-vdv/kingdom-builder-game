import type { ActionCategoryConfig, Registry } from '@kingdom-builder/protocol';

interface CategoryOverrides {
	readonly population?: string;
	readonly basic?: string;
	readonly building?: string;
	readonly develop?: string;
}

function toMatchable(value: string | undefined): string {
	return value?.toLowerCase() ?? '';
}

export function resolveActionCategoryIds(
	registry: Registry<ActionCategoryConfig>,
	overrides?: CategoryOverrides,
): { population: string; basic: string; building: string; develop: string } {
	const entries = registry.entries();
	const fallbackId = entries[0]?.[0] ?? 'actions';
	const find = (
		override: string | undefined,
		predicate: (definition: ActionCategoryConfig) => boolean,
	): string => {
		if (override) {
			return override;
		}
		const match = entries.find(([, definition]) => predicate(definition));
		if (match) {
			return match[0];
		}
		return fallbackId;
	};
	return {
		population: find(overrides?.population, (definition) => {
			const title = toMatchable(definition.title);
			const subtitle = toMatchable(definition.subtitle);
			return (
				title.includes('hire') ||
				title.includes('population') ||
				subtitle.includes('hire') ||
				subtitle.includes('population')
			);
		}),
		basic: find(overrides?.basic, (definition) =>
			toMatchable(definition.title).includes('basic'),
		),
		building: find(overrides?.building, (definition) => {
			const title = toMatchable(definition.title);
			return title.includes('build') || title.includes('construct');
		}),
		develop: find(overrides?.develop, (definition) =>
			toMatchable(definition.title).includes('develop'),
		),
	};
}
