import { useEffect, useMemo, useState } from 'react';
import type {
	SessionActionRequirementList,
	SessionRequirementFailure,
} from '@kingdom-builder/protocol/session';
import type { LegacySession } from '../../state/sessionTypes';
import { loadActionRequirements } from '../../state/sessionSdk';

export type RoleRequirementState = {
	failures: SessionActionRequirementList;
	ready: boolean;
	loading: boolean;
};

function cloneRequirementList(
	requirements: SessionActionRequirementList,
): SessionActionRequirementList {
	return requirements.map((failure) => {
		const cloned: SessionRequirementFailure = {
			requirement: failure.requirement,
		};
		if (failure.details) {
			cloned.details = { ...failure.details };
		}
		if (failure.message) {
			cloned.message = failure.message;
		}
		return cloned;
	});
}

function createEmptyState(): RoleRequirementState {
	return { failures: [], ready: false, loading: false };
}

export function useActionRoleRequirements(
	actionId: string,
	roles: string[],
	session: LegacySession,
	sessionId: string,
): Map<string, RoleRequirementState> {
	const [requirements, setRequirements] = useState<
		Map<string, RoleRequirementState>
	>(() => new Map());
	useEffect(() => {
		const active = new Set(roles);
		setRequirements((previous) => {
			const next = new Map(previous);
			for (const key of Array.from(next.keys())) {
				if (!active.has(key)) {
					next.delete(key);
				}
			}
			for (const role of active) {
				if (!next.has(role)) {
					next.set(role, createEmptyState());
				}
			}
			return next;
		});
	}, [roles]);
	const roleKey = useMemo(() => roles.join('|'), [roles]);
	useEffect(() => {
		if (roles.length === 0) {
			return () => {};
		}
		let disposed = false;
		const controllers: AbortController[] = [];
		const unsubscribes: Array<() => void> = [];
		for (const role of roles) {
			const params = { role } as const;
			const snapshot = session.readActionMetadata(actionId, params);
			setRequirements((previous) => {
				const next = new Map(previous);
				const prior = next.get(role) ?? createEmptyState();
				if (snapshot.requirements !== undefined) {
					next.set(role, {
						failures: cloneRequirementList(snapshot.requirements),
						ready: true,
						loading: false,
					});
				} else {
					next.set(role, { ...prior, ready: false, loading: true });
				}
				return next;
			});
			if (snapshot.requirements === undefined) {
				const controller = new AbortController();
				controllers.push(controller);
				void loadActionRequirements(sessionId, actionId, params, {
					signal: controller.signal,
				}).catch(() => {
					if (controller.signal.aborted) {
						return;
					}
					setRequirements((previous) => {
						const next = new Map(previous);
						const prior = next.get(role) ?? createEmptyState();
						next.set(role, { ...prior, loading: false, ready: false });
						return next;
					});
				});
			}
			const unsubscribe = session.subscribeActionMetadata(
				actionId,
				params,
				(nextSnapshot) => {
					if (disposed) {
						return;
					}
					setRequirements((previous) => {
						const next = new Map(previous);
						const prior = next.get(role) ?? createEmptyState();
						if (nextSnapshot.requirements === undefined) {
							next.set(role, { ...prior, ready: false, loading: true });
						} else {
							next.set(role, {
								failures: cloneRequirementList(nextSnapshot.requirements),
								ready: true,
								loading: false,
							});
						}
						return next;
					});
				},
			);
			unsubscribes.push(unsubscribe);
		}
		return () => {
			disposed = true;
			for (const unsubscribe of unsubscribes) {
				unsubscribe();
			}
			for (const controller of controllers) {
				controller.abort();
			}
		};
	}, [session, sessionId, actionId, roleKey, roles]);
	return requirements;
}

export function getRoleRequirementState(
	requirements: Map<string, RoleRequirementState>,
	role: string,
): RoleRequirementState {
	return requirements.get(role) ?? createEmptyState();
}
