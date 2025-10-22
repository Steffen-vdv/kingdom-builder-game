import type { EngineContext } from '../context';
import type { PlayerState } from '../state';
import type { RuntimeResourceCatalog } from './types';
import {
	buildNodeIndex,
	getDefaultBounds,
	sumChildValues,
} from './state.nodes';
import type { ResourceNode, ResourceNodeParent } from './state.nodes';
import type {
	AdjustResourceBoundsOptions,
	AdjustResourceBoundsResult,
	ClampResult,
	ResourceStateHelpers,
	WriteResourceValueOptions,
	WriteResourceValueResult,
} from './state.types';

export type {
	WriteResourceValueOptions,
	WriteResourceValueResult,
	AdjustResourceBoundsOptions,
	AdjustResourceBoundsResult,
	ClampResult,
	ResourceStateHelpers,
} from './state.types';

function assertInteger(value: number, label: string): void {
	if (!Number.isInteger(value)) {
		throw new Error(`${label} expected an integer but received ${value}.`);
	}
}

function clampToBounds(
	value: number,
	lower: number | null,
	upper: number | null,
): ClampResult {
	let finalValue = value;
	let clampedToLowerBound = false;
	let clampedToUpperBound = false;
	if (lower !== null && finalValue < lower) {
		finalValue = lower;
		clampedToLowerBound = true;
	}
	if (upper !== null && finalValue > upper) {
		finalValue = upper;
		clampedToUpperBound = true;
	}
	return { finalValue, clampedToLowerBound, clampedToUpperBound };
}

function computeTierId(node: ResourceNode, value: number): string | null {
	for (const tier of node.tiers) {
		const min = tier.threshold.min ?? null;
		const max = tier.threshold.max ?? null;
		if ((min === null || value >= min) && (max === null || value <= max)) {
			return tier.id;
		}
	}
	return null;
}

function ensureBoundTouchedEntry(
	player: PlayerState,
	resourceId: string,
): { lower: boolean; upper: boolean } {
	const existing = player.resourceBoundTouched[resourceId];
	if (existing) {
		return existing;
	}
	const created = { lower: false, upper: false };
	player.resourceBoundTouched[resourceId] = created;
	return created;
}

function updateTierForValue(
	player: PlayerState,
	node: ResourceNode,
	value: number,
): void {
	player.resourceTierIds[node.id] = computeTierId(node, value);
}

export function createResourceStateHelpers(
	catalog: RuntimeResourceCatalog,
): ResourceStateHelpers {
	const { nodes, childToParent, resourceNodes, parentNodes } =
		buildNodeIndex(catalog);

	const expectNode = (resourceId: string): ResourceNode => {
		const node = nodes.get(resourceId);
		if (!node) {
			throw new Error(`Unknown ResourceV2 id "${resourceId}".`);
		}
		return node;
	};

	const ensureBounds = (
		player: PlayerState,
		node: ResourceNode,
	): { lower: number | null; upper: number | null } => {
		let lower = player.resourceLowerBounds[node.id];
		let upper = player.resourceUpperBounds[node.id];
		if (lower === undefined || upper === undefined) {
			const defaults = getDefaultBounds(node);
			if (lower === undefined) {
				lower = defaults.lower;
				player.resourceLowerBounds[node.id] = lower;
			}
			if (upper === undefined) {
				upper = defaults.upper;
				player.resourceUpperBounds[node.id] = upper;
			}
		}
		return { lower: lower ?? null, upper: upper ?? null };
	};

	const applyValue = (
		player: PlayerState,
		node: ResourceNode,
		resourceId: string,
		finalValue: number,
		options: WriteResourceValueOptions & { allowParentMutation?: boolean } = {},
	): { previousValue: number; nextValue: number; delta: number } => {
		if (node.kind === 'parent' && !options.allowParentMutation) {
			throw new Error(
				`Resource "${resourceId}" is a limited ResourceGroup parent and cannot be mutated directly.`,
			);
		}
		assertInteger(finalValue, `Resource "${resourceId}"`);
		const previousValue = player.resourceValues[resourceId] ?? 0;
		player.resourceValues[resourceId] = finalValue;
		const delta = finalValue - previousValue;
		if (delta !== 0) {
			player.resourceTouched[resourceId] = true;
			if (!options.suppressLog && options.context) {
				options.context.recentResourceGains.push({
					key: resourceId,
					amount: delta,
				});
			}
		}
		updateTierForValue(player, node, finalValue);
		return { previousValue, nextValue: finalValue, delta };
	};

	const recomputeParentValue = (
		player: PlayerState,
		node: ResourceNodeParent,
		context?: EngineContext,
	): void => {
		const bounds = ensureBounds(player, node);
		const sum = sumChildValues(player, node.childIds);
		const clampResult = clampToBounds(sum, bounds.lower, bounds.upper);
		const applyOptions: WriteResourceValueOptions & {
			allowParentMutation?: boolean;
		} = {
			suppressLog: true,
			allowParentMutation: true,
			...(context ? { context } : {}),
		};
		applyValue(player, node, node.id, clampResult.finalValue, applyOptions);
	};

	const updateParentForChild = (
		player: PlayerState,
		resourceId: string,
		context?: EngineContext,
	): void => {
		const parentId = childToParent.get(resourceId);
		if (!parentId) {
			return;
		}
		const parentNode = nodes.get(parentId);
		if (!parentNode || parentNode.kind !== 'parent') {
			return;
		}
		recomputeParentValue(player, parentNode, context);
	};

	const initialisePlayerState = (player: PlayerState): void => {
		for (const node of nodes.values()) {
			player.resourceTouched[node.id] = false;
			ensureBoundTouchedEntry(player, node.id);
			const defaults = getDefaultBounds(node);
			player.resourceLowerBounds[node.id] = defaults.lower;
			player.resourceUpperBounds[node.id] = defaults.upper;
		}

		for (const node of resourceNodes) {
			const bounds = ensureBounds(player, node);
			const { finalValue } = clampToBounds(0, bounds.lower, bounds.upper);
			applyValue(player, node, node.id, finalValue, { suppressLog: true });
		}

		for (const node of parentNodes) {
			recomputeParentValue(player, node);
		}
	};

	const readValue = (player: PlayerState, resourceId: string): number => {
		expectNode(resourceId);
		const value = player.resourceValues[resourceId];
		return typeof value === 'number' ? value : 0;
	};

	const writeValue = (
		player: PlayerState,
		resourceId: string,
		nextValue: number,
		options: WriteResourceValueOptions = {},
	): WriteResourceValueResult => {
		if (!Number.isFinite(nextValue)) {
			throw new Error(
				`Resource "${resourceId}" expected a finite numeric value but received ${nextValue}.`,
			);
		}
		const node = expectNode(resourceId);
		const bounds = ensureBounds(player, node);
		const clampResult = clampToBounds(nextValue, bounds.lower, bounds.upper);
		const {
			previousValue,
			nextValue: appliedValue,
			delta,
		} = applyValue(player, node, resourceId, clampResult.finalValue, options);
		if (node.kind === 'resource') {
			updateParentForChild(player, resourceId, options.context);
		}
		return {
			previousValue,
			nextValue: appliedValue,
			delta,
			finalValue: clampResult.finalValue,
			clampedToLowerBound: clampResult.clampedToLowerBound,
			clampedToUpperBound: clampResult.clampedToUpperBound,
		};
	};

	const adjustBounds = (
		player: PlayerState,
		resourceId: string,
		options: AdjustResourceBoundsOptions,
	): AdjustResourceBoundsResult => {
		const node = expectNode(resourceId);
		const current = ensureBounds(player, node);
		let nextLower = current.lower;
		let nextUpper = current.upper;
		if (options.nextLowerBound !== undefined) {
			if (options.nextLowerBound !== null) {
				assertInteger(
					options.nextLowerBound,
					`Resource "${resourceId}" lower bound`,
				);
			}
			nextLower = options.nextLowerBound;
		}
		if (options.nextUpperBound !== undefined) {
			if (options.nextUpperBound !== null) {
				assertInteger(
					options.nextUpperBound,
					`Resource "${resourceId}" upper bound`,
				);
			}
			nextUpper = options.nextUpperBound;
		}
		if (nextLower !== null && nextUpper !== null && nextLower > nextUpper) {
			throw new Error(
				`Resource "${resourceId}" lower bound ${nextLower} cannot exceed upper bound ${nextUpper}.`,
			);
		}
		const lowerChanged = nextLower !== current.lower;
		const upperChanged = nextUpper !== current.upper;
		if (lowerChanged) {
			player.resourceLowerBounds[resourceId] = nextLower;
		}
		if (upperChanged) {
			player.resourceUpperBounds[resourceId] = nextUpper;
		}
		if (lowerChanged || upperChanged) {
			const touched = ensureBoundTouchedEntry(player, resourceId);
			touched.lower ||= lowerChanged;
			touched.upper ||= upperChanged;
		}
		const previousValue = player.resourceValues[resourceId] ?? 0;
		const clampResult = clampToBounds(previousValue, nextLower, nextUpper);
		let delta = 0;
		let nextValue = previousValue;
		if (clampResult.finalValue !== previousValue) {
			const applyOptions: WriteResourceValueOptions & {
				allowParentMutation?: boolean;
			} = {
				allowParentMutation: node.kind === 'parent',
				...(options.suppressLog !== undefined
					? { suppressLog: options.suppressLog }
					: {}),
				...(options.context ? { context: options.context } : {}),
			};
			const applyResult = applyValue(
				player,
				node,
				resourceId,
				clampResult.finalValue,
				applyOptions,
			);
			delta = applyResult.delta;
			nextValue = applyResult.nextValue;
		} else {
			updateTierForValue(player, node, previousValue);
		}
		if (node.kind === 'resource') {
			updateParentForChild(player, resourceId, options.context);
		} else {
			recomputeParentValue(player, node, options.context);
		}
		return {
			previousLowerBound: current.lower,
			nextLowerBound: nextLower,
			previousUpperBound: current.upper,
			nextUpperBound: nextUpper,
			lowerBoundChanged: lowerChanged,
			upperBoundChanged: upperChanged,
			previousValue,
			nextValue,
			delta,
			finalValue: clampResult.finalValue,
			clampedToLowerBound: clampResult.clampedToLowerBound,
			clampedToUpperBound: clampResult.clampedToUpperBound,
		};
	};

	return {
		initialisePlayerState,
		readValue,
		writeValue,
		adjustBounds,
	};
}
