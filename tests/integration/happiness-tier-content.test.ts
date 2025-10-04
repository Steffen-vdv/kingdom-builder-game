import { describe, it, expect } from 'vitest';
import { Resource } from '@kingdom-builder/contents';
import { createTestContext } from './fixtures';

describe('content happiness tiers', () => {
	it('exposes tier passive metadata for web presentation', () => {
		const ctx = createTestContext();
		const player = ctx.activePlayer;
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

			const passives = ctx.passives.values(player.id).map((passive) => ({
				id: passive.id,
				detail: passive.detail,
				meta: passive.meta,
			}));

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
              "detail": "💰 Income +25% while the realm is content.",
              "id": "passive:happiness:content",
              "meta": {
                "removal": {
                  "text": "Removed when happiness leaves the +3 to +4 range",
                  "token": "happiness leaves the +3 to +4 range",
                },
                "source": {
                  "id": "happiness:tier:content",
                  "type": "tiered-resource",
                },
              },
            },
          ],
          "skipPhases": {},
          "skipSteps": {},
        },
        "despair": {
          "happiness": -10,
          "passives": [
            {
              "detail": "💰 Income -50%. 📉 Skip Raise Strength. ⚖️ Councils grant half ⚡.",
              "id": "passive:happiness:despair",
              "meta": {
                "removal": {
                  "text": "Removed when happiness rises to -9 or higher",
                  "token": "happiness rises to -9 or higher",
                },
                "source": {
                  "id": "happiness:tier:despair",
                  "type": "tiered-resource",
                },
              },
            },
          ],
          "skipPhases": {},
          "skipSteps": {
            "growth": {
              "raise-strength": {
                "passive:happiness:despair": true,
              },
            },
          },
        },
        "ecstatic": {
          "happiness": 10,
          "passives": [
            {
              "detail": "💰 Income +50%. 🏛️ Building costs reduced by 20%.",
              "id": "passive:happiness:ecstatic",
              "meta": {
                "removal": {
                  "text": "Removed when happiness drops below +10",
                  "token": "happiness drops below +10",
                },
                "source": {
                  "id": "happiness:tier:ecstatic",
                  "type": "tiered-resource",
                },
              },
            },
          ],
          "skipPhases": {},
          "skipSteps": {},
        },
        "elated": {
          "happiness": 8,
          "passives": [
            {
              "detail": "💰 Income +50%. 🏛️ Building costs reduced by 20%.",
              "id": "passive:happiness:elated",
              "meta": {
                "removal": {
                  "text": "Removed when happiness leaves the +8 to +9 range",
                  "token": "happiness leaves the +8 to +9 range",
                },
                "source": {
                  "id": "happiness:tier:elated",
                  "type": "tiered-resource",
                },
              },
            },
          ],
          "skipPhases": {},
          "skipSteps": {},
        },
        "grim": {
          "happiness": -5,
          "passives": [
            {
              "detail": "💰 Income -25%. 📉 Skip Raise Strength until spirits recover.",
              "id": "passive:happiness:grim",
              "meta": {
                "removal": {
                  "text": "Removed when happiness leaves the -5 to -4 range",
                  "token": "happiness leaves the -5 to -4 range",
                },
                "source": {
                  "id": "happiness:tier:grim",
                  "type": "tiered-resource",
                },
              },
            },
          ],
          "skipPhases": {},
          "skipSteps": {
            "growth": {
              "raise-strength": {
                "passive:happiness:grim": true,
              },
            },
          },
        },
        "joyful": {
          "happiness": 5,
          "passives": [
            {
              "detail": "💰 Income +25%. 🏛️ Building costs reduced by 20%.",
              "id": "passive:happiness:joyful",
              "meta": {
                "removal": {
                  "text": "Removed when happiness leaves the +5 to +7 range",
                  "token": "happiness leaves the +5 to +7 range",
                },
                "source": {
                  "id": "happiness:tier:joyful",
                  "type": "tiered-resource",
                },
              },
            },
          ],
          "skipPhases": {},
          "skipSteps": {},
        },
        "misery": {
          "happiness": -8,
          "passives": [
            {
              "detail": "💰 Income -50%. 📉 Skip Raise Strength while morale is desperate.",
              "id": "passive:happiness:misery",
              "meta": {
                "removal": {
                  "text": "Removed when happiness leaves the -8 to -6 range",
                  "token": "happiness leaves the -8 to -6 range",
                },
                "source": {
                  "id": "happiness:tier:misery",
                  "type": "tiered-resource",
                },
              },
            },
          ],
          "skipPhases": {},
          "skipSteps": {
            "growth": {
              "raise-strength": {
                "passive:happiness:misery": true,
              },
            },
          },
        },
        "steady": {
          "happiness": 0,
          "passives": [
            {
              "detail": "Morale is steady. No tier bonuses are active.",
              "id": "passive:happiness:steady",
              "meta": {
                "removal": {
                  "text": "Removed when happiness leaves the 0 to 2 range",
                  "token": "happiness leaves the 0 to 2 range",
                },
                "source": {
                  "id": "happiness:tier:steady",
                  "type": "tiered-resource",
                },
              },
            },
          ],
          "skipPhases": {},
          "skipSteps": {},
        },
        "unrest": {
          "happiness": -3,
          "passives": [
            {
              "detail": "💰 Income -25% while unrest simmers.",
              "id": "passive:happiness:unrest",
              "meta": {
                "removal": {
                  "text": "Removed when happiness leaves the -3 to -1 range",
                  "token": "happiness leaves the -3 to -1 range",
                },
                "source": {
                  "id": "happiness:tier:unrest",
                  "type": "tiered-resource",
                },
              },
            },
          ],
          "skipPhases": {},
          "skipSteps": {},
        },
      }
    `);
	});
});
