/**
 * Generic phase ID types for contents-sdk.
 * Games can narrow these types by defining their own PhaseId and PhaseStepId.
 */

/**
 * Generic phase identifier.
 * Games define their own phase IDs (e.g., 'upkeep', 'action', 'income').
 */
export type PhaseId = string;

/**
 * Generic phase step identifier.
 * Games define their own step IDs within phases.
 */
export type PhaseStepId = string;
