import type { EffectHandler } from '../../effects';
import type { EngineContext } from '../../context';
import type { PlayerState } from '../../state';
import {
	getResourceValue,
	increaseResourceUpperBound,
	setResourceValue,
	type SetResourceValueOptions,
} from '../state';
import {
	isBoundReference,
	resolveBoundValue,
	resolveResourceDefinition,
} from '../state-helpers';
import { reconcileResourceChange } from '../reconciliation';
import type {
	ResolvedBounds,
	ResourceChangeParameters,
	ResourceReconciliationInput,
	ResourceReconciliationMode,
	ResourceReconciliationResult,
} from '../reconciliation/types';

import type {
	RuntimeResourceCatalog,
	RuntimeResourceDefinition,
} from '../types';

// Inline valid modes to avoid circular dependency with reconciliation module
const VALID_MODES: ReadonlySet<ResourceReconciliationMode> = new Set([
	'clamp',
	'pass',
	'reject',
]);

export type ResourcePlayerScope = 'active' | 'opponent';

export interface ResourceValueWriteOptions extends Record<string, unknown> {
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

export interface ResourceTransferEndpointPayload
	extends Record<string, unknown> {
	/**
	 * Player scope to resolve. Defaults to the active player when omitted.
	 */
	readonly player?: ResourcePlayerScope;
	/**
	 * Identifier of the Resource entry to adjust.
	 * Limited parent resources are rejected.
	 */
	readonly resourceId: string;
	/**
	 * Change definition used to compute the requested delta before
	 * reconciliation.
	 */
	readonly change: ResourceChangeParameters;
	readonly reconciliationMode?: ResourceReconciliationMode;
	readonly options?: ResourceValueWriteOptions;
}

export interface ResourceTransferEffectParams extends Record<string, unknown> {
	/**
	 * Resource configuration describing the donor side of the transfer.
	 * The donor must request a negative delta (amount removal).
	 * That delta is reconciled against the donor's own bounds.
	 */
	readonly donor: ResourceTransferEndpointPayload;
	/**
	 * Resource configuration describing the recipient side of the transfer.
	 * The recipient must request a positive delta (amount gain).
	 * That delta is reconciled against the recipient's own bounds.
	 */
	readonly recipient: ResourceTransferEndpointPayload;
}

export interface ResourceUpperBoundIncreaseParams
	extends Record<string, unknown> {
	/**
	 * Player scope to resolve. Defaults to the active player.
	 */
	readonly player?: ResourcePlayerScope;
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
	readonly bounds: ResolvedBounds;
	readonly currentValue: number;
	readonly options: SetResourceValueOptions;
}

function requireRuntimeCatalog(context: EngineContext): RuntimeResourceCatalog {
	return context.resourceCatalog;
}

function resolvePlayer(
	context: EngineContext,
	scope: ResourcePlayerScope | undefined,
): PlayerState {
	if (scope === 'opponent') {
		return context.opponent;
	}
	return context.activePlayer;
}

/**
 * Resolves the effective bound for a resource.
 * For dynamic bounds (references), always use the definition to re-resolve
 * the current referenced resource value. For static bounds, check player
 * overrides first, then fall back to definition.
 */
function resolveEffectiveBounds(
	player: PlayerState,
	resourceId: string,
	definition: RuntimeResourceDefinition,
): ResolvedBounds {
	const defLower = definition.lowerBound;
	const defUpper = definition.upperBound;
	const playerLower = player.resourceLowerBounds[resourceId];
	const playerUpper = player.resourceUpperBounds[resourceId];
	// For dynamic bounds (references), always use definition to get fresh value.
	// For static bounds, player overrides take precedence.
	const lowerBoundValue = isBoundReference(defLower)
		? defLower
		: (playerLower ?? defLower ?? null);
	const upperBoundValue = isBoundReference(defUpper)
		? defUpper
		: (playerUpper ?? defUpper ?? null);
	// Resolve any references to get final numeric values
	return {
		lowerBound: resolveBoundValue(lowerBoundValue, player.resourceValues),
		upperBound: resolveBoundValue(upperBoundValue, player.resourceValues),
	};
}

function normaliseWriteOptions(
	options: ResourceValueWriteOptions | undefined,
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
	payload: ResourceTransferEndpointPayload,
): TransferParticipantContext {
	const player = resolvePlayer(context, payload.player);
	const lookup = resolveResourceDefinition(catalog, payload.resourceId);
	if (!lookup || lookup.kind !== 'resource') {
		throw new Error(
			`Resource transfer cannot target limited parent resource "${payload.resourceId}".`,
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

function assertValidReconciliationMode(
	mode: ResourceReconciliationMode | undefined,
	resourceId: string,
): void {
	if (mode && !VALID_MODES.has(mode)) {
		throw new Error(
			`Resource effect for "${resourceId}" has invalid reconciliation ` +
				`mode "${mode}". Valid modes: ${[...VALID_MODES].join(', ')}.`,
		);
	}
}

function reconcileParticipant(
	participant: TransferParticipantContext,
	payload: ResourceTransferEndpointPayload,
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
				`Resource transfer donor "${resourceId}" must request a negative delta (received ${result.requestedDelta}).`,
			);
		}
		if (result.appliedDelta > 0) {
			throw new Error(
				`Resource transfer donor "${resourceId}" produced a positive delta after reconciliation (${result.appliedDelta}).`,
			);
		}
	} else if (role === 'recipient') {
		if (result.requestedDelta <= 0) {
			throw new Error(
				`Resource transfer recipient "${resourceId}" must request a positive delta (received ${result.requestedDelta}).`,
			);
		}
		if (result.appliedDelta < 0) {
			throw new Error(
				`Resource transfer recipient "${resourceId}" produced a negative delta after reconciliation (${result.appliedDelta}).`,
			);
		}
	}
}

export const resourceTransfer: EffectHandler<ResourceTransferEffectParams> = (
	effect,
	context,
) => {
	const params = effect.params;
	if (!params) {
		throw new Error(
			'Resource transfer effect requires "donor" and "recipient" parameters.',
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

export const resourceIncreaseUpperBound: EffectHandler<
	ResourceUpperBoundIncreaseParams
> = (effect, context) => {
	const params = effect.params;
	if (!params) {
		throw new Error(
			'Resource upper-bound increase effect requires "resourceId" and "delta" parameters.',
		);
	}
	const catalog = requireRuntimeCatalog(context);
	const player = resolvePlayer(context, params.player);
	const lookup = resolveResourceDefinition(catalog, params.resourceId);
	if (!lookup || lookup.kind !== 'resource') {
		throw new Error(
			`Resource upper-bound increase cannot target limited parent resource "${params.resourceId}".`,
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
