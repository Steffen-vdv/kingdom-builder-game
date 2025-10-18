import { expect, test } from '@playwright/test';
import { SessionManager } from '../../packages/server/src/session/SessionManager.js';
import { SessionTransport } from '../../packages/server/src/transport/SessionTransport.js';
import { TransportError } from '../../packages/server/src/transport/TransportTypes.js';
import type { TransportErrorCode } from '../../packages/server/src/transport/TransportTypes.js';
import type { Page } from '@playwright/test';
import type { ActionExecuteRequest } from '@kingdom-builder/protocol/actions';
import type {
	SessionActionCostRequest,
	SessionActionOptionsRequest,
	SessionActionRequirementRequest,
	SessionAdvanceRequest,
	SessionCreateRequest,
	SessionRunAiRequest,
	SessionSetDevModeRequest,
	SessionSimulateRequest,
	SessionUpdatePlayerNameRequest,
} from '@kingdom-builder/protocol/session';

const AUTH_ROLES = ['admin', 'session:create', 'session:advance'] as const;

type AuthRole = (typeof AUTH_ROLES)[number];

interface AuthContext {
	userId: string;
	roles: AuthRole[];
	token: string;
}

function createAuthContext(): AuthContext {
	return {
		userId: 'ui-test',
		roles: [...AUTH_ROLES],
		token: 'ui-test-token',
	};
}

function statusFromError(code: TransportErrorCode): number {
	switch (code) {
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
}

async function clickAllContinueButtons(page: Page): Promise<void> {
	const continueButton = page.getByRole('button', { name: 'Continue' });
	for (let attempt = 0; attempt < 10; attempt += 1) {
		const becameVisible = await continueButton
			.waitFor({ state: 'visible', timeout: 2_000 })
			.then(() => true)
			.catch(() => false);
		if (!becameVisible) {
			break;
		}
		await expect(continueButton).toBeEnabled();
		await continueButton.click();
		await continueButton.waitFor({ state: 'hidden' }).catch(() => {});
	}
}

async function waitForOpponentTaxResolution(page: Page) {
	const continueButton = page.getByRole('button', { name: 'Continue' });
	for (let attempt = 0; attempt < 10; attempt += 1) {
		await continueButton.waitFor({ state: 'visible' });
		const resolutionCard = page
			.locator('div[data-state="enter"]')
			.filter({ has: continueButton })
			.first();
		const headingText = await resolutionCard
			.getByRole('heading')
			.first()
			.innerText();
		if (/Action\s*-\s*Tax/i.test(headingText)) {
			return { card: resolutionCard, continueButton };
		}
		await expect(continueButton).toBeEnabled();
		await continueButton.click();
		await continueButton.waitFor({ state: 'hidden' }).catch(() => {});
	}
	throw new Error('Opponent Tax resolution was not displayed.');
}

test.describe('AI turn sequencing', () => {
	test.beforeEach(async ({ page }) => {
		const sessionManager = new SessionManager();
		const transport = new SessionTransport({
			sessionManager,
			authMiddleware: (request) => {
				if (request.auth) {
					return request.auth;
				}
				const context = createAuthContext();
				request.auth = context;
				return context;
			},
		});

		await page.route('**/api/**', async (route) => {
			const request = route.request();
			const method = request.method();
			const url = new URL(request.url());
			const path = url.pathname.replace(/^\/api/, '');
			const headers = request.headers() as Record<string, string | undefined>;
			let bodyData: unknown;
			if (method !== 'GET') {
				const raw = request.postData();
				if (raw) {
					try {
						bodyData = JSON.parse(raw);
					} catch {
						bodyData = raw.length > 0 ? raw : undefined;
					}
				}
			}
			const mergePayload = (extras: Record<string, unknown>) => ({
				...(typeof bodyData === 'object' && bodyData !== null
					? (bodyData as Record<string, unknown>)
					: {}),
				...extras,
			});
			const respondJson = async (status: number, payload: unknown) => {
				await route.fulfill({
					status,
					contentType: 'application/json',
					body: JSON.stringify(payload),
				});
			};
			const buildRequest = <T>(payload: T) => ({
				body: payload,
				headers,
				auth: createAuthContext(),
			});

			try {
				if (method === 'POST' && path === '/sessions') {
					const payload = mergePayload({}) as SessionCreateRequest;
					const response = transport.createSession(buildRequest(payload));
					await respondJson(201, response);
					return;
				}
				const sessionMatch = path.match(/^\/sessions\/([^/]+)(.*)$/);
				if (!sessionMatch) {
					await route.fallback();
					return;
				}
				const sessionId = decodeURIComponent(sessionMatch[1]);
				const remainder = sessionMatch[2];

				if (method === 'GET' && remainder === '/snapshot') {
					const stateRequest = { sessionId } as SessionAdvanceRequest;
					const response = transport.getSessionState(
						buildRequest(stateRequest),
					);
					await respondJson(200, response);
					return;
				}
				if (method === 'POST' && remainder === '/advance') {
					const advanceRequest = { sessionId } as SessionAdvanceRequest;
					const response = await transport.advanceSession(
						buildRequest(advanceRequest),
					);
					await respondJson(200, response);
					return;
				}
				if (method === 'POST' && remainder === '/actions') {
					const payload = mergePayload({ sessionId }) as ActionExecuteRequest;
					const response = await transport.executeAction(buildRequest(payload));
					const status =
						(response as { httpStatus?: number }).httpStatus ?? 200;
					await respondJson(status, response);
					return;
				}
				if (method === 'POST' && remainder === '/ai-turn') {
					const payload = mergePayload({ sessionId }) as SessionRunAiRequest;
					const response = await transport.runAiTurn(buildRequest(payload));
					await respondJson(200, response);
					return;
				}
				if (method === 'POST' && remainder === '/simulate') {
					const payload = mergePayload({ sessionId }) as SessionSimulateRequest;
					const response = await transport.simulateUpcomingPhases(
						buildRequest(payload),
					);
					await respondJson(200, response);
					return;
				}
				if (method === 'POST' && remainder === '/dev-mode') {
					const payload = mergePayload({
						sessionId,
					}) as SessionSetDevModeRequest;
					const response = transport.setDevMode(buildRequest(payload));
					await respondJson(200, response);
					return;
				}
				if (method === 'PATCH' && remainder === '/player') {
					const payload = mergePayload({
						sessionId,
					}) as SessionUpdatePlayerNameRequest;
					const response = transport.updatePlayerName(buildRequest(payload));
					await respondJson(200, response);
					return;
				}
				const actionMatch = remainder.match(
					/^\/actions\/([^/]+)(\/costs|\/requirements|\/options)$/,
				);
				if (actionMatch) {
					const actionId = decodeURIComponent(actionMatch[1]);
					const suffix = actionMatch[2];
					if (suffix === '/options' && method === 'GET') {
						const requestPayload = {
							sessionId,
							actionId,
						} as SessionActionOptionsRequest;
						const response = transport.getActionOptions(
							buildRequest(requestPayload),
						);
						await respondJson(200, response);
						return;
					}
					if (suffix === '/costs' && method === 'POST') {
						const payload = mergePayload({
							sessionId,
							actionId,
						}) as SessionActionCostRequest;
						const response = transport.getActionCosts(buildRequest(payload));
						await respondJson(200, response);
						return;
					}
					if (suffix === '/requirements' && method === 'POST') {
						const payload = mergePayload({
							sessionId,
							actionId,
						}) as SessionActionRequirementRequest;
						const response = transport.getActionRequirements(
							buildRequest(payload),
						);
						await respondJson(200, response);
						return;
					}
				}
				await route.fallback();
			} catch (error) {
				if (error instanceof TransportError) {
					await respondJson(statusFromError(error.code), {
						code: error.code,
						message: error.message,
						issues: error.issues ?? null,
					});
					return;
				}
				throw error;
			}
		});
	});

	test('advances opponent turns and awaits confirmations', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Start New Game' }).click();

		const taxAction = page.getByRole('button', { name: 'Tax' });
		await expect(taxAction).toBeVisible();
		await taxAction.click();
		await clickAllContinueButtons(page);

		const nextTurnButton = page.getByRole('button', { name: 'Next Turn' });
		await expect(nextTurnButton).toBeEnabled();
		await nextTurnButton.click();

		const opponentIndicator = page
			.locator('span', { hasText: 'Opponent Turn' })
			.first();
		await expect(opponentIndicator).toBeVisible();

		const { card: opponentResolution, continueButton } =
			await waitForOpponentTaxResolution(page);
		await expect(opponentResolution.getByText(/Played by/i)).toContainText(
			'Opponent',
		);
		await expect(opponentResolution.locator('ol li').first()).toContainText(
			/Gold/i,
		);
		await expect(continueButton).toBeEnabled();
		await continueButton.click();
		await continueButton.waitFor({ state: 'hidden' }).catch(() => {});

		await clickAllContinueButtons(page);
		await expect(opponentIndicator).toBeHidden();
		await expect(nextTurnButton).toBeDisabled();
	});
});
