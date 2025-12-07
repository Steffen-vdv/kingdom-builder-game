import type { EffectHandler } from '../../effects';
import type { EngineContext } from '../../context';
import type { PlayerState } from '../../state';
import {
	getResourceValue,
	increaseResourceUpperBound,
	setResourceValue,
	type SetResourceValueOptions,
} from '../state';
import { resolveResourceDefinition } from '../state-helpers';
import {
	reconcileResourceChange,
	type ResourceChangeParameters,
	type ResourceReconciliationInput,
	type ResourceReconciliationMode,
	type ResourceReconciliationResult,
} from '../reconciliation';
import type {
	RuntimeResourceCatalog,
	RuntimeResourceDefinition,
	RuntimeResourceBounds,
} from '../types';

export type ResourceV2PlayerScope = 'active' | 'opponent';

export interface ResourceV2ValueWriteOptions extends Record<string, unknown> {
	/**
	 * Prevent the write from emitting an entry to
	 * {@link EngineContext.recentResourceGains}.
	 * Use for silent transfers or bound tweaks that should stay unlogged.
	 */
	readonly suppressRecentEntry?: boolean;
	/**
	 * Avoid recalculating tier assignments when the value write is applied.
	 */
	readonly skipTierUpdate?: boolean;
}

export interface ResourceV2TransferEndpointPayload extends Record<
	string,
	unknown
> {
	/**
	 * Player scope to resolve. Defaults to the active player when omitted.
	 */
	readonly player?: ResourceV2PlayerScope;
	/**
	 * Identifier of the ResourceV2 entry to adjust.
	 * Limited parent resources are rejected.
	 */
	readonly resourceId: string;
	/**
	 * Change definition used to compute the requested delta before
	 * reconciliation.
	 */
	readonly change: ResourceChangeParameters;
	readonly reconciliationMode?: ResourceReconciliationMode;
	readonly options?: ResourceV2ValueWriteOptions;
}

export interface ResourceV2TransferEffectParams extends Record<
	string,
	unknown
> {
	/**
	 * Resource configuration describing the donor side of the transfer.
	 * The donor must request a negative delta (amount removal).
	 * That delta is reconciled against the donor's own bounds.
	 */
	readonly donor: ResourceV2TransferEndpointPayload;
	/**
	 * Resource configuration describing the recipient side of the transfer.
	 * The recipient must request a positive delta (amount gain).
	 * That delta is reconciled against the recipient's own bounds.
	 */
	readonly recipient: ResourceV2TransferEndpointPayload;
}

export interface ResourceV2UpperBoundIncreaseParams extends Record<
	string,
	unknown
> {
	/**
	 * Player scope to resolve. Defaults to the active player.
	 */
	readonly player?: ResourceV2PlayerScope;
	/**
	 * Identifier of the resource whose upper bound should increase.
	 * Limited parents are rejected.
	 */
	readonly resourceId: string;
	/**
	 * Positive integer delta to add to the effective upper bound.
	 */
	readonly delta: number;
}

interface TransferParticipantContext {
	readonly player: PlayerState;
	readonly resourceId: string;
	readonly definition: RuntimeResourceDefinition;
	readonly bounds: RuntimeResourceBounds;
	readonly currentValue: number;
	readonly options: SetResourceValueOptions;
}

function requireRuntimeCatalog(context: EngineContext): RuntimeResourceCatalog {
	return context.resourceCatalogV2;
}

function resolvePlayer(
	context: EngineContext,
	scope: ResourceV2PlayerScope | undefined,
): PlayerState {
	if (scope === 'opponent') {
		return context.opponent;
	}
	return context.activePlayer;
}

function resolveEffectiveBound(
	override: number | null | undefined,
	fallback: number | null | undefined,
): number | null {
	if (typeof override === 'number') {
		return override;
	}
	if (typeof fallback === 'number') {
		return fallback;
	}
	return null;
}

function resolveEffectiveBounds(
	player: PlayerState,
	resourceId: string,
	definition: RuntimeResourceDefinition,
): RuntimeResourceBounds {
	return {
		lowerBound: resolveEffectiveBound(
			player.resourceLowerBounds[resourceId],
			definition.lowerBound ?? null,
		),
		upperBound: resolveEffectiveBound(
			player.resourceUpperBounds[resourceId],
			definition.upperBound ?? null,
		),
	};
}

function normaliseWriteOptions(
	options: ResourceV2ValueWriteOptions | undefined,
): SetResourceValueOptions {
	if (!options) {
		return {};
	}
	const { suppressRecentEntry = false, skipTierUpdate = false } = options;
	return { suppressRecentEntry, skipTierUpdate };
}

function prepareTransferParticipant(
	context: EngineContext,
	catalog: RuntimeResourceCatalog,
	payload: ResourceV2TransferEndpointPayload,
): TransferParticipantContext {
	const player = resolvePlayer(context, payload.player);
	const lookup = resolveResourceDefinition(catalog, payload.resourceId);
	if (!lookup || lookup.kind !== 'resource') {
		throw new Error(
			`ResourceV2 transfer cannot target limited parent resource "${payload.resourceId}".`,
		);
	}
	const definition = lookup.definition;
	return {
		player,
		resourceId: payload.resourceId,
		definition,
		bounds: resolveEffectiveBounds(player, payload.resourceId, definition),
		currentValue: getResourceValue(player, payload.resourceId),
		options: normaliseWriteOptions(payload.options),
	};
}

const VALID_RECONCILIATION_MODES: ReadonlySet<ResourceReconciliationMode> =
	new Set(['clamp', 'pass', 'reject']);

function assertValidReconciliationMode(
	mode: ResourceReconciliationMode | undefined,
	resourceId: string,
): void {
	if (mode && !VALID_RECONCILIATION_MODES.has(mode)) {
		throw new Error(
			`ResourceV2 effect for "${resourceId}" has invalid reconciliation ` +
				`mode "${mode}". Valid modes: ${[...VALID_RECONCILIATION_MODES].join(', ')}.`,
		);
	}
}

function reconcileParticipant(
	participant: TransferParticipantContext,
	payload: ResourceV2TransferEndpointPayload,
): ResourceReconciliationResult {
	assertValidReconciliationMode(
		payload.reconciliationMode,
		participant.resourceId,
	);
	const input: ResourceReconciliationInput = {
		currentValue: participant.currentValue,
		bounds: participant.bounds,
		change: payload.change,
		reconciliationMode: payload.reconciliationMode ?? 'clamp',
	};
	return reconcileResourceChange(input);
}

function validateTransferDirection(
	role: 'donor' | 'recipient',
	resourceId: string,
	result: ResourceReconciliationResult,
): void {
	if (role === 'donor') {
		if (result.requestedDelta >= 0) {
			throw new Error(
				`ResourceV2 transfer donor "${resourceId}" must request a negative delta (received ${result.requestedDelta}).`,
			);
		}
		if (result.appliedDelta > 0) {
			throw new Error(
				`ResourceV2 transfer donor "${resourceId}" produced a positive delta after reconciliation (${result.appliedDelta}).`,
			);
		}
	} else if (role === 'recipient') {
		if (result.requestedDelta <= 0) {
			throw new Error(
				`ResourceV2 transfer recipient "${resourceId}" must request a positive delta (received ${result.requestedDelta}).`,
			);
		}
		if (result.appliedDelta < 0) {
			throw new Error(
				`ResourceV2 transfer recipient "${resourceId}" produced a negative delta after reconciliation (${result.appliedDelta}).`,
			);
		}
	}
}

export const resourceV2Transfer: EffectHandler<
	ResourceV2TransferEffectParams
> = (effect, context) => {
	const params = effect.params;
	if (!params) {
		throw new Error(
			'ResourceV2 transfer effect requires "donor" and "recipient" parameters.',
		);
	}
	const catalog = requireRuntimeCatalog(context);
	const donorParticipant = prepareTransferParticipant(
		context,
		catalog,
		params.donor,
	);
	const recipientParticipant = prepareTransferParticipant(
		context,
		catalog,
		params.recipient,
	);
	if (
		donorParticipant.player === recipientParticipant.player &&
		donorParticipant.resourceId === recipientParticipant.resourceId
	) {
		return;
	}
	const donorReconciliation = reconcileParticipant(
		donorParticipant,
		params.donor,
	);
	validateTransferDirection(
		'donor',
		donorParticipant.resourceId,
		donorReconciliation,
	);
	const donorCapacity = Math.abs(donorReconciliation.appliedDelta);
	if (donorCapacity === 0) {
		return;
	}
	const recipientReconciliation = reconcileParticipant(
		recipientParticipant,
		params.recipient,
	);
	validateTransferDirection(
		'recipient',
		recipientParticipant.resourceId,
		recipientReconciliation,
	);
	const recipientCapacity = recipientReconciliation.appliedDelta;
	if (recipientCapacity === 0) {
		return;
	}
	const transferAmount = Math.min(donorCapacity, recipientCapacity);
	if (transferAmount <= 0) {
		return;
	}
	const donorNextValue = donorParticipant.currentValue - transferAmount;
	const recipientNextValue = recipientParticipant.currentValue + transferAmount;

	// Pass mode bypasses bounds - tell setResourceValue to skip clamping
	const donorSkipBoundClamp = params.donor.reconciliationMode === 'pass';
	const recipientSkipBoundClamp =
		params.recipient.reconciliationMode === 'pass';

	if (donorNextValue !== donorParticipant.currentValue) {
		setResourceValue(
			context,
			donorParticipant.player,
			catalog,
			donorParticipant.resourceId,
			donorNextValue,
			{ ...donorParticipant.options, skipBoundClamp: donorSkipBoundClamp },
		);
	}
	if (recipientNextValue !== recipientParticipant.currentValue) {
		setResourceValue(
			context,
			recipientParticipant.player,
			catalog,
			recipientParticipant.resourceId,
			recipientNextValue,
			{
				...recipientParticipant.options,
				skipBoundClamp: recipientSkipBoundClamp,
			},
		);
	}
};

export const resourceV2IncreaseUpperBound: EffectHandler<
	ResourceV2UpperBoundIncreaseParams
> = (effect, context) => {
	const params = effect.params;
	if (!params) {
		throw new Error(
			'ResourceV2 upper-bound increase effect requires "resourceId" and "delta" parameters.',
		);
	}
	const catalog = requireRuntimeCatalog(context);
	const player = resolvePlayer(context, params.player);
	const lookup = resolveResourceDefinition(catalog, params.resourceId);
	if (!lookup || lookup.kind !== 'resource') {
		throw new Error(
			`ResourceV2 upper-bound increase cannot target limited parent resource "${params.resourceId}".`,
		);
	}
	increaseResourceUpperBound(
		context,
		player,
		catalog,
		params.resourceId,
		params.delta,
	);
};
