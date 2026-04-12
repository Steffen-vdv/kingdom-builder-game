import { Registry } from '@boardsmith/protocol';

export function createRegistry<T extends { id: string }>(items: T[]) {
	const registry = new Registry<T>();
	for (const item of items) {
		registry.add(item.id, item);
	}
	return registry;
}
