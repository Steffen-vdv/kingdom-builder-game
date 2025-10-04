import { describe, it, expect } from 'vitest';
import { Resource } from '@kingdom-builder/contents';
import { createTestContext } from './fixtures';
import { translateTierSummary } from '../../packages/web/src/translation/content/tierSummaries';

describe('content happiness tiers', () => {
	it('exposes tier passive metadata for web presentation', () => {
		const ctx = createTestContext();
		const player = ctx.activePlayer;
		const tiersById = new Map(
			ctx.services.rules.tierDefinitions.map((tier) => [tier.id, tier]),
		);
		const samples = [
			{ value: -10, label: 'despair' },
			{ value: -8, label: 'misery' },
			{ value: -5, label: 'grim' },
			{ value: -3, label: 'unrest' },
			{ value: 0, label: 'steady' },
			{ value: 3, label: 'content' },
			{ value: 5, label: 'joyful' },
			{ value: 8, label: 'elated' },
			{ value: 10, label: 'ecstatic' },
		] as const;

		const snapshot: Record<string, unknown> = {};

		for (const sample of samples) {
			player.resources[Resource.happiness] = sample.value;
			ctx.services.handleTieredResourceChange(ctx, Resource.happiness);

			const passives = ctx.passives.values(player.id).map((passive) => {
				const sourceId = passive.meta?.source?.id;
				const tier = sourceId ? tiersById.get(sourceId) : undefined;
				const summaryToken = tier?.display?.summaryToken;
				const summary = translateTierSummary(summaryToken);
				const removalToken = passive.meta?.removal?.token;
				return {
					id: passive.id,
					removalToken,
					summary,
					summaryToken,
				};
			});

			snapshot[sample.label] = {
				happiness: sample.value,
				passives,
				skipPhases: JSON.parse(JSON.stringify(player.skipPhases)),
				skipSteps: JSON.parse(JSON.stringify(player.skipSteps)),
			};
		}

		expect(snapshot).toMatchInlineSnapshot(`
      {
        "content": {
          "happiness": 3,
          "passives": [
            {
              "id": "passive:happiness:content",
              "removalToken": "happiness leaves the +3 to +4 range",
              "summary": "💰 Income +20% while the realm is content.",
              "summaryToken": "happiness.tier.summary.content",
            },
          ],
          "skipPhases": {},
          "skipSteps": {},
        },
        "despair": {
          "happiness": -10,
          "passives": [
            {
              "id": "passive:happiness:despair",
              "removalToken": "happiness rises to -9 or higher",
              "summary": "💰 Income -50%. ⏭️ Skip Growth. 🛡️ War Recovery skipped.",
              "summaryToken": "happiness.tier.summary.despair",
            },
          ],
          "skipPhases": {
            "growth": {
              "passive:happiness:despair": true,
            },
          },
          "skipSteps": {
            "upkeep": {
              "war-recovery": {
                "passive:happiness:despair": true,
              },
            },
          },
        },
        "ecstatic": {
          "happiness": 10,
          "passives": [
            {
              "id": "passive:happiness:ecstatic",
              "removalToken": "happiness drops below +10",
              "summary": "💰 Income +50%. 🏛️ Building costs reduced by 20%. 📈 Growth +20%.",
              "summaryToken": "happiness.tier.summary.ecstatic",
            },
          ],
          "skipPhases": {},
          "skipSteps": {},
        },
        "elated": {
          "happiness": 8,
          "passives": [
            {
              "id": "passive:happiness:elated",
              "removalToken": "happiness leaves the +8 to +9 range",
              "summary": "💰 Income +50%. 🏛️ Building costs reduced by 20%.",
              "summaryToken": "happiness.tier.summary.elated",
            },
          ],
          "skipPhases": {},
          "skipSteps": {},
        },
        "grim": {
          "happiness": -5,
          "passives": [
            {
              "id": "passive:happiness:grim",
              "removalToken": "happiness leaves the -7 to -5 range",
              "summary": "💰 Income -25%. ⏭️ Skip Growth until spirits recover.",
              "summaryToken": "happiness.tier.summary.grim",
            },
          ],
          "skipPhases": {
            "growth": {
              "passive:happiness:grim": true,
            },
          },
          "skipSteps": {},
        },
        "joyful": {
          "happiness": 5,
          "passives": [
            {
              "id": "passive:happiness:joyful",
              "removalToken": "happiness leaves the +5 to +7 range",
              "summary": "💰 Income +25%. 🏛️ Building costs reduced by 20%.",
              "summaryToken": "happiness.tier.summary.joyful",
            },
          ],
          "skipPhases": {},
          "skipSteps": {},
        },
        "misery": {
          "happiness": -8,
          "passives": [
            {
              "id": "passive:happiness:misery",
              "removalToken": "happiness leaves the -9 to -8 range",
              "summary": "💰 Income -50%. ⏭️ Skip Growth while morale is desperate.",
              "summaryToken": "happiness.tier.summary.misery",
            },
          ],
          "skipPhases": {
            "growth": {
              "passive:happiness:misery": true,
            },
          },
          "skipSteps": {},
        },
        "steady": {
          "happiness": 0,
          "passives": [],
          "skipPhases": {},
          "skipSteps": {},
        },
        "unrest": {
          "happiness": -3,
          "passives": [
            {
              "id": "passive:happiness:unrest",
              "removalToken": "happiness leaves the -4 to -3 range",
              "summary": "💰 Income -25% while unrest simmers.",
              "summaryToken": "happiness.tier.summary.unrest",
            },
          ],
          "skipPhases": {},
          "skipSteps": {},
        },
      }
    `);
	});
});
