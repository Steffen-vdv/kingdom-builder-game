import type {
	ResourceV2StateBlueprint,
	ResourceV2StateChildDefinition,
	ResourceV2StateParentDefinition,
	ResourceV2StateValueDefinition,
} from './metadata';
import { initialiseResourceTierState } from './tiering';

export interface ResourceV2ValueBoundsState {
	lowerBound?: number;
	upperBound?: number;
}

export interface ResourceV2TierProgressState {
	value: number;
	min: number;
	max?: number;
}

export interface ResourceV2TierStepState {
	readonly id: string;
	readonly index: number;
	readonly min: number;
	readonly max?: number;
	readonly label?: string;
}

export interface ResourceV2RecentTierTransition {
	readonly resourceId: string;
	readonly trackId: string;
	readonly fromStepId?: string;
	readonly toStepId?: string;
}

export interface ResourceV2TierState {
	readonly trackId: string;
	readonly steps: readonly ResourceV2TierStepState[];
	currentStepId?: string;
	currentStepIndex?: number;
	previousStepId?: string;
	nextStepId?: string;
	progress?: ResourceV2TierProgressState;
	touched: boolean;
}

export interface ResourceV2MutableValueState {
	readonly id: string;
	value: number;
	bounds: ResourceV2ValueBoundsState;
	tier?: ResourceV2TierState;
	touched: boolean;
}

export interface ResourceV2MutableChildState
	extends ResourceV2MutableValueState {
	readonly limited: false;
	readonly parentId?: string;
}

export interface ResourceV2MutableParentState
	extends ResourceV2MutableValueState {
	readonly limited: true;
	readonly children: readonly string[];
}

export type ResourceV2MutableStateValue =
	| ResourceV2MutableChildState
	| ResourceV2MutableParentState;

export type ResourceV2ValueState = Readonly<ResourceV2MutableStateValue>;

export interface ResourceV2State {
	readonly blueprint: ResourceV2StateBlueprint;
	readonly values: Map<string, ResourceV2MutableStateValue>;
	recentTierTransitions: ResourceV2RecentTierTransition[];
}

export interface InitializeResourceV2StateOptions {
	readonly values?: Record<string, number>;
}

function cloneBounds(
	definition: ResourceV2StateValueDefinition,
): ResourceV2ValueBoundsState {
	const bounds: ResourceV2ValueBoundsState = {};
	if (definition.bounds?.lowerBound !== undefined) {
		bounds.lowerBound = definition.bounds.lowerBound;
	}
	if (definition.bounds?.upperBound !== undefined) {
		bounds.upperBound = definition.bounds.upperBound;
	}
	return bounds;
}

function createTierState(
	definition: ResourceV2StateValueDefinition,
): ResourceV2TierState | undefined {
	const track = definition.tierTrack;
	if (!track) {
		return undefined;
	}
	const steps: ResourceV2TierStepState[] = track.steps.map((step, index) => ({
		id: step.id,
		index,
		min: step.min,
		...(step.max !== undefined ? { max: step.max } : {}),
		...(step.display?.label ? { label: step.display.label } : {}),
	}));
	return {
		trackId: track.id,
		steps,
		touched: false,
	} satisfies ResourceV2TierState;
}

function clampValue(value: number, bounds: ResourceV2ValueBoundsState): number {
	let next = value;
	if (bounds.lowerBound !== undefined && next < bounds.lowerBound) {
		next = bounds.lowerBound;
	}
	if (bounds.upperBound !== undefined && next > bounds.upperBound) {
		next = bounds.upperBound;
	}
	return next;
}

function createChildState(
	definition: ResourceV2StateChildDefinition,
): ResourceV2MutableChildState {
	const bounds = cloneBounds(definition);
	const tier = createTierState(definition);
	const parentId = definition.parentId;
	return {
		id: definition.id,
		value: clampValue(0, bounds),
		bounds,
		touched: false,
		limited: false,
		...(tier ? { tier } : {}),
		...(parentId ? { parentId } : {}),
	} satisfies ResourceV2MutableChildState;
}

function createParentState(
	definition: ResourceV2StateParentDefinition,
): ResourceV2MutableParentState {
	const bounds = cloneBounds(definition);
	const tier = createTierState(definition);
	return {
		id: definition.id,
		value: clampValue(0, bounds),
		bounds,
		touched: false,
		limited: true,
		children: definition.children,
		...(tier ? { tier } : {}),
	} satisfies ResourceV2MutableParentState;
}

function getMutableResourceValue(
	state: ResourceV2State,
	id: string,
): ResourceV2MutableStateValue {
	const existing = state.values.get(id);
	if (!existing) {
		throw new Error(`Unknown ResourceV2 value requested: ${id}`);
	}
	return existing;
}

function resolveParentId(
	state: ResourceV2State,
	childId: string,
): string | undefined {
	const child = state.values.get(childId);
	if (child && child.limited === false && child.parentId) {
		return child.parentId;
	}
	return state.blueprint.childToParent.get(childId);
}

function recomputeParentValue(
	state: ResourceV2State,
	parentId: string,
	markTouched: boolean,
): void {
	const definition = state.blueprint.values.get(parentId);
	if (!definition || definition.kind !== 'group-parent') {
		return;
	}
	const parent = state.values.get(parentId);
	if (!parent || parent.limited !== true) {
		return;
	}
	let total = 0;
	for (const childId of definition.children) {
		const child = state.values.get(childId);
		if (child) {
			total += child.value;
		}
	}
	const next = clampValue(total, parent.bounds);
	if (parent.value !== next) {
		parent.value = next;
		if (markTouched) {
			parent.touched = true;
		}
		const ancestor = state.blueprint.childToParent.get(parentId);
		if (ancestor) {
			recomputeParentValue(state, ancestor, markTouched);
		}
	} else if (markTouched) {
		const ancestor = state.blueprint.childToParent.get(parentId);
		if (ancestor) {
			recomputeParentValue(state, ancestor, markTouched);
		}
	}
}

export function createResourceV2State(
	blueprint: ResourceV2StateBlueprint,
	options: InitializeResourceV2StateOptions = {},
): ResourceV2State {
	const values = new Map<string, ResourceV2MutableStateValue>();

	for (const definition of blueprint.values.values()) {
		if (definition.kind === 'group-parent') {
			values.set(definition.id, createParentState(definition));
		} else {
			values.set(definition.id, createChildState(definition));
		}
	}

	const state: ResourceV2State = {
		blueprint,
		values,
		recentTierTransitions: [],
	};

	if (options.values) {
		for (const [id, amount] of Object.entries(options.values)) {
			const definition = blueprint.values.get(id);
			if (!definition) {
				throw new Error(`Cannot initialise unknown ResourceV2 value: ${id}`);
			}
			if (definition.kind !== 'resource') {
				throw new Error(
					`Cannot directly initialise limited ResourceV2 parent: ${id}`,
				);
			}
			const node = getMutableResourceValue(
				state,
				id,
			) as ResourceV2MutableChildState;
			node.value = clampValue(amount, node.bounds);
		}
	}

	for (const parentId of blueprint.parentToChildren.keys()) {
		recomputeParentValue(state, parentId, false);
	}

	initialiseResourceTierState(state);

	return state;
}

export function clearResourceTierTouches(state: ResourceV2State): void {
	for (const value of state.values.values()) {
		if (value.tier) {
			value.tier.touched = false;
		}
	}
}

export function clearRecentTierTransitions(state: ResourceV2State): void {
	state.recentTierTransitions = [];
}

export function getResourceValue(state: ResourceV2State, id: string): number {
	return getMutableResourceValue(state, id).value;
}

export function getResourceValueState(
	state: ResourceV2State,
	id: string,
): ResourceV2ValueState {
	return getMutableResourceValue(state, id);
}

export function isResourceTouched(state: ResourceV2State, id: string): boolean {
	return getMutableResourceValue(state, id).touched;
}

export function markResourceUntouched(
	state: ResourceV2State,
	id: string,
): void {
	getMutableResourceValue(state, id).touched = false;
}

export function clearResourceTouches(state: ResourceV2State): void {
	for (const value of state.values.values()) {
		value.touched = false;
	}
}

export function setResourceValue(
	state: ResourceV2State,
	id: string,
	amount: number,
	markTouched = true,
): number {
	const node = getMutableResourceValue(state, id);
	if (node.limited) {
		throw new Error(
			`Cannot directly mutate limited ResourceV2 parent value: ${id}`,
		);
	}
	const next = clampValue(amount, node.bounds);
	if (node.value !== next) {
		node.value = next;
		if (markTouched) {
			node.touched = true;
		}
		const parentId = resolveParentId(state, id);
		if (parentId) {
			recomputeParentValue(state, parentId, markTouched);
		}
	}
	return node.value;
}

export function adjustResourceValue(
	state: ResourceV2State,
	id: string,
	delta: number,
	markTouched = true,
): number {
	const node = getMutableResourceValue(state, id);
	return setResourceValue(state, id, node.value + delta, markTouched);
}

export function isLimitedResource(state: ResourceV2State, id: string): boolean {
	return getMutableResourceValue(state, id).limited;
}
