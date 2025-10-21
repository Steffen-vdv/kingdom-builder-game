# Follow-up: Reinstate ESLint Curly, Max Length, and Identifier Rules in Tests

The test overrides no longer disable `curly`, `max-len`, or `id-length`. The
first lint sweep exposed numerous violations that require refactoring across
the repository. Track and resolve the following groups of issues:

- **packages/contents/tests**
  - `builder-validations.test.ts`: Wrap long expectations or helper calls to
    meet the 80 character limit at lines 158, 202, 209, and 237.

- **packages/engine/tests**
  - `actions/synthetic.test.ts`: Add braces to the `while` loop that manages the
    synthetic action iterator (line 8).
  - `advance-skip.test.ts`: Reformat long assertions at lines 107 and 109.
  - `ai/tax-collector.test.ts`: Wrap the `if` statement at line 28 in braces.
  - `attack-zero-damage-no-effects.test.ts`: Reflow expectations at lines 212
    and 251.
  - `context/queue.test.ts`: Rename the helper identifier `ms` to a descriptive
    alternative that satisfies `id-length`.
  - `effects/*.test.ts`: Multiple suites rely on terse control flow in `while`,
    `for-of`, and `if` statements. Update each occurrence to use explicit
    braces and wrap long literals where needed. Affected files include
    `action_add`, `action_remove`, `add_building`, `add_development`,
    `cost-mod-action-owner`, `cost_mod`, `population`, `resource-add`,
    `resource-remove`, and `resource-transfer-percent-bounds`.
  - Additional suites with long lines or missing braces: `engine.property`,
    `happiness-tier-controller`, `phases/growth`, `phases/upkeep`,
    `plunder-zero-gold`, `requirements/evaluator_compare`, `resolveAttack`,
    `result-mod-stack`, `services/rules`, `stat-sources.longevity`, and
    `stat-sources.metadata`.

- **packages/web/tests**
  - Add braces to conditional helpers and wrap assertions across numerous files,
    including `ActionsPanel.test.tsx`, `Game.render.test.tsx`,
    `development-translation.test.ts`, fixtures (e.g.,
    `helpers/actionsPanel.ts`, `fixtures/syntheticTaxData.ts`), translation
    suites, and log-related tests. Ensure each long template or expectation is
    reformatted to satisfy the 80 character limit.

- **tests/integration**
  - Update the integration fixtures and suites (`action-log-hooks`,
    `building-stat-bonus`, `fixtures.ts`, `turn-cycle`) to add braces and break
    overly long lines per the repository style guide.

The total lint output reported 161 errors after reenabling these rules; each
bullet above corresponds to the file groups surfaced by `npm run lint` on
2025-10-04 and should be addressed in subsequent focused patches.
