import { expect, test } from '@playwright/test';
import {
	SessionManager,
	SessionTransport,
	TransportError,
	type TransportRequest,
} from '@kingdom-builder/server';
import type {
	SessionAdvanceResponse,
	SessionCreateResponse,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import { RESOURCES } from '@kingdom-builder/contents';
import defaultRegistryMetadata from '../../packages/web/src/contexts/defaultRegistryMetadata.json';

type JsonMetadata = typeof defaultRegistryMetadata;

type SnapshotResponse = Pick<SessionCreateResponse, 'snapshot' | 'registries'>;

const ADMIN_CONTEXT = {
	userId: 'playwright',
	roles: ['admin', 'session:create', 'session:advance'] as const,
} as const;

let latestSnapshot: SessionSnapshot | null = null;

const statusFromTransportError = (error: TransportError): number => {
	switch (error.code) {
		case 'INVALID_REQUEST':
			return 400;
		case 'NOT_FOUND':
			return 404;
		case 'CONFLICT':
			return 409;
		case 'UNAUTHORIZED':
			return 401;
		case 'FORBIDDEN':
			return 403;
		default:
			return 500;
	}
};

const updateSnapshotState = (response: SnapshotResponse) => {
	latestSnapshot = response.snapshot;
};

test.beforeEach(async ({ page }) => {
	latestSnapshot = null;
	const sessionManager = new SessionManager();
	const transport = new SessionTransport({
		sessionManager,
		authMiddleware: (request) => {
			request.auth = ADMIN_CONTEXT;
			return ADMIN_CONTEXT;
		},
	});

	await page.route('**/api/**', async (route) => {
		const request = route.request();
		const url = new URL(request.url());
		const method = request.method();
		const path = url.pathname.replace(/^\/api/, '');
		const segments = path.split('/').filter(Boolean);
		const headers = request.headers();
		const parseBody = (): Record<string, unknown> => {
			const raw = request.postData();
			if (!raw) {
				return {};
			}
			try {
				return JSON.parse(raw) as Record<string, unknown>;
			} catch {
				return {};
			}
		};
		const fulfillJson = async (status: number, payload: unknown) =>
			route.fulfill({
				status,
				contentType: 'application/json',
				body: JSON.stringify(payload),
			});
		const toTransportRequest = <T extends Record<string, unknown>>(
			body: T,
		): TransportRequest<T> => ({ headers, body });

		try {
			if (segments[0] !== 'sessions') {
				await route.fallback();
				return;
			}
			if (segments.length === 1 && method === 'POST') {
				const body = parseBody();
				const response = transport.createSession(toTransportRequest(body));
				updateSnapshotState(response);
				await fulfillJson(201, response);
				return;
			}
			if (segments.length < 2) {
				await fulfillJson(404, { message: 'Not Found' });
				return;
			}
			const sessionId = decodeURIComponent(segments[1] ?? '');
			if (!sessionId) {
				await fulfillJson(400, { message: 'Missing session identifier.' });
				return;
			}
			if (
				segments.length === 3 &&
				segments[2] === 'snapshot' &&
				method === 'GET'
			) {
				const response = transport.getSessionState(
					toTransportRequest({ sessionId }),
				);
				updateSnapshotState(response);
				await fulfillJson(200, response);
				return;
			}
			if (
				segments.length === 3 &&
				segments[2] === 'advance' &&
				method === 'POST'
			) {
				const body = { ...parseBody(), sessionId };
				const response = (await transport.advanceSession(
					toTransportRequest(body),
				)) as SessionAdvanceResponse;
				updateSnapshotState(response);
				await fulfillJson(200, response);
				return;
			}
			if (
				segments.length === 3 &&
				segments[2] === 'dev-mode' &&
				method === 'POST'
			) {
				const body = { ...parseBody(), sessionId };
				const response = transport.setDevMode(toTransportRequest(body));
				updateSnapshotState(response);
				await fulfillJson(200, response);
				return;
			}
			if (
				segments.length === 3 &&
				segments[2] === 'player' &&
				method === 'PATCH'
			) {
				const body = { ...parseBody(), sessionId };
				const response = transport.updatePlayerName(toTransportRequest(body));
				updateSnapshotState(response);
				await fulfillJson(200, response);
				return;
			}
			if (
				segments.length === 3 &&
				segments[2] === 'ai-turn' &&
				method === 'POST'
			) {
				const body = { ...parseBody(), sessionId };
				const response = await transport.runAiTurn(toTransportRequest(body));
				updateSnapshotState(response);
				await fulfillJson(200, response);
				return;
			}
			if (
				segments.length === 3 &&
				segments[2] === 'simulate' &&
				method === 'POST'
			) {
				const body = { ...parseBody(), sessionId };
				const response = await transport.simulateUpcomingPhases(
					toTransportRequest(body),
				);
				await fulfillJson(200, response);
				return;
			}
			if (segments[2] === 'actions') {
				if (segments.length === 3 && method === 'POST') {
					const body = { ...parseBody(), sessionId };
					const response = await transport.executeAction(
						toTransportRequest(body),
					);
					const status =
						(response as { httpStatus?: number }).httpStatus ?? 200;
					const payload = { ...response };
					if (
						(payload as { status?: string }).status === 'success' &&
						(payload as { snapshot?: SessionSnapshot }).snapshot
					) {
						latestSnapshot = (payload as { snapshot: SessionSnapshot })
							.snapshot;
					}
					await fulfillJson(status, payload);
					return;
				}
				if (segments.length >= 5) {
					const actionId = decodeURIComponent(segments[3] ?? '');
					if (!actionId) {
						await fulfillJson(400, { message: 'Missing action identifier.' });
						return;
					}
					if (segments[4] === 'costs' && method === 'POST') {
						const body = { ...parseBody(), sessionId, actionId };
						const response = transport.getActionCosts(toTransportRequest(body));
						await fulfillJson(200, response);
						return;
					}
					if (segments[4] === 'requirements' && method === 'POST') {
						const body = { ...parseBody(), sessionId, actionId };
						const response = transport.getActionRequirements(
							toTransportRequest(body),
						);
						await fulfillJson(200, response);
						return;
					}
					if (segments[4] === 'options' && method === 'GET') {
						const response = transport.getActionOptions(
							toTransportRequest({ sessionId, actionId }),
						);
						await fulfillJson(200, response);
						return;
					}
				}
			}
			await fulfillJson(404, { message: 'Not Found' });
		} catch (error) {
			if (error instanceof TransportError) {
				await fulfillJson(statusFromTransportError(error), {
					code: error.code,
					message: error.message,
					issues: error.issues ?? null,
				});
				return;
			}
			await fulfillJson(500, { message: 'Internal Server Error' });
		}
	});
});

test.afterEach(({ page }) => page.unroute('**/api/**'));

const getEffectLogCount = () =>
	!latestSnapshot?.metadata.effectLogs
		? 0
		: Object.values(latestSnapshot.metadata.effectLogs).reduce(
				(total, entries) => total + entries.length,
				0,
			);

test.describe('Game metadata', () => {
	test('phases, roles, and logs align with registry metadata', async ({
		page,
	}) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Start Dev/Debug Game' }).click();

		await expect
			.poll(() => latestSnapshot?.phases.length ?? 0)
			.toBeGreaterThan(0);

		const nextTurnButton = page.getByRole('button', { name: 'Next Turn' });
		await expect(nextTurnButton).toBeVisible();

		const phasePanel = nextTurnButton.locator('xpath=ancestor::section[1]');
		const phaseItems = phasePanel.locator('li');

		const snapshot = latestSnapshot as SessionSnapshot;
		await expect(phaseItems).toHaveCount(snapshot.phases.length);

		const phasesMetadata =
			(defaultRegistryMetadata as JsonMetadata).metadata.phases ?? {};
		for (let index = 0; index < snapshot.phases.length; index += 1) {
			const phase = snapshot.phases[index]!;
			const meta = phasesMetadata[phase.id];
			const expectedIcon = meta?.icon?.trim() ?? '';
			const expectedLabel = meta?.label ?? phase.id;
			const { iconText, labelText } = await phaseItems
				.nth(index)
				.evaluate((element) => {
					const spans = element.querySelectorAll('span');
					const iconNode = spans[1];
					const labelNode = spans[2];
					return {
						iconText: iconNode?.textContent?.trim() ?? '',
						labelText: labelNode?.textContent?.trim() ?? '',
					};
				});
			expect(iconText).toBe(expectedIcon);
			expect(labelText).toBe(expectedLabel);
		}

		const hireSection = page
			.locator('section')
			.filter({ has: page.getByRole('heading', { name: /Hire/ }) });
		const hireCards = hireSection.locator('.action-card');
		const populationMetadata =
			(defaultRegistryMetadata as JsonMetadata).metadata.populations ?? {};
		const populationCount = Object.keys(populationMetadata).length;
		await expect(hireCards).toHaveCount(populationCount);

		const iconByLabel = new Map(
			Object.entries(populationMetadata).map(([roleId, descriptor]) => {
				const label = descriptor?.label ?? roleId;
				const icon = descriptor?.icon?.trim() ?? '';
				return [label, icon] as const;
			}),
		);

		const displayedRoles = await hireCards.evaluateAll((cards) =>
			cards.map((card) => {
				const title = card.querySelector('.text-base.font-medium');
				if (!title) {
					return { icon: '', label: '' };
				}
				const spans = title.querySelectorAll('span');
				const roleSpan = spans[1];
				if (!roleSpan) {
					return { icon: '', label: title.textContent?.trim() ?? '' };
				}
				const parts = roleSpan.querySelectorAll('span');
				const iconText =
					parts.length > 1 ? (parts[0]?.textContent?.trim() ?? '') : '';
				const labelIndex = parts.length > 1 ? 1 : 0;
				const labelText = parts[labelIndex]?.textContent?.trim() ?? '';
				return { icon: iconText, label: labelText };
			}),
		);

		for (const { icon, label } of displayedRoles) {
			const expectedIcon = iconByLabel.get(label);
			expect(expectedIcon).toBeDefined();
			expect(icon).toBe(expectedIcon ?? '');
		}

		await expect(nextTurnButton).toBeEnabled();
		await nextTurnButton.click();

		await expect.poll(getEffectLogCount).toBeGreaterThan(0);

		await page.getByRole('button', { name: 'Log' }).click();
		const logEntries = page.locator('#game-log-panel ul li');
		await expect(logEntries.first()).toBeVisible();

		const goldIcon = RESOURCES.gold.icon?.trim() ?? '🪙';
		const logText = await logEntries.first().innerText();
		expect(logText.replace(/\s+/g, ' ')).toContain(goldIcon);
	});
});
