# Happiness Threshold System Rollout Plan

## Current Capabilities and Gaps

- The engine already exposes a `tieredResource` service that reads `rules.tierDefinitions`, but those entries currently only supply lightweight multipliers and are not tied to passives or UI metadata. 【F:packages/engine/src/services/index.ts†L10-L78】【F:packages/contents/src/rules.ts†L5-L19】
- Passive handling registers cost/result modifiers, yet modifiers only support flat adjustments and the passive registry does not surface source or removal hints for the UI. 【F:packages/engine/src/effects/cost_mod.ts†L1-L28】【F:packages/engine/src/services/index.ts†L87-L188】【F:packages/web/src/components/player/PassiveDisplay.tsx†L1-L87】
- Resource gains record per-effect deltas through `recentResourceGains`, but no hook currently reacts to happiness changes to swap passives, nor do passives influence turn flow such as skipping growth or upkeep steps. 【F:packages/engine/src/effects/resource_add.ts†L1-L16】【F:packages/engine/src/index.ts†L211-L306】
- The web hover card for resources simply echoes static descriptions and the passive list lacks context, so players cannot see which happiness tier is active. 【F:packages/web/src/components/player/ResourceBar.tsx†L1-L86】【F:packages/web/src/components/player/PassiveDisplay.tsx†L1-L87】

## Task Sequence

1. **Rule Schema & Builder Upgrade**
   - Extend the `RuleSet` type and content builders so each happiness tier can define: id, inclusive range, passive payload (effects, skip flags, text tokens), and display metadata such as removal conditions.
   - Update synthetic content helpers and validation so tests/builders can construct the richer tier definitions.
   - Output: Updated schema/types, builder helpers, and unit tests that exercise tier parsing without yet modifying runtime behaviour.

2. **Engine Modifier Enhancements**
   - Teach `cost_mod` and `result_mod` handlers plus the `PassiveManager` to support percentage-based adjustments that combine additively after flat modifiers.
   - Ensure evaluation modifiers can scale positive and negative gains multiplicatively, and surface both flat and percentage modifiers in cost computation.
   - Add regression tests covering stacked percent modifiers on representative actions/evaluations.

3. **Tier Passive Lifecycle & Happiness Tracking**
   - Introduce a happiness threshold controller within the engine that reacts whenever the tiered resource changes (gain or loss) and swaps the configured passive accordingly.
   - Wire the controller so passives receive source/removal metadata and register skip-phase or skip-step flags on the active player state.
   - Verify through engine tests that tier transitions add/remove the correct passive, respect additive percent stacking, and clear the passive when happiness drops below the range.

4. **Turn Flow & Logging Integration**
   - Update `advance` (and any helper utilities) to honour the skip markers: skipping the entire Growth phase, omitting specific steps like War Recovery, and emitting structured log entries explaining the skips.
   - Ensure the log diff and phase history UIs receive clear messages when a tier passive suppresses a phase/step, and cover this with automated tests.

5. **Content Implementation of Happiness Thresholds**
   - Use the upgraded builders to encode each threshold (+10, +8… etc.) as content-driven passives with the specified modifiers, skip behaviour, and descriptive copy for the UI.
   - Remove the old placeholder `tierDefinitions` and align other content (e.g., rules, translations) with the new structure.
   - Provide snapshot tests (contents or integration) to confirm the correct passive metadata is emitted for the web client.

6. **Frontend Presentation & Highlighting**
   - Expand the passive display to show the source icon/label and removal condition supplied by the engine.
   - Overhaul the happiness hover card to list every threshold, highlight the active one, and reuse shared formatting for modifier descriptions.
   - Adjust log, phase banner, and tooltip translations so skipped phases/steps and tier changes are clearly communicated, backed by UI tests.

7. **QA & Cross-Domain Validation**
   - Run cross-domain smoke tests (engine + web) to ensure tier transitions update costs, results, and turn flow consistently.
   - Document any developer-facing notes (e.g., how to extend future thresholds) to accompany the implementation.

Each task builds on the previous one, so agents should execute them in order to gradually enable and visualise the full happiness threshold experience.
