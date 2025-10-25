# Project Definition – Resource Migration (Stakeholder Edition)

## Executive Summary

The Resource Migration initiative replaces three separate game systems (resources, stats, population/roles) with a single configurable platform called **ResourceV2**. This consolidation simplifies the mental model for both configurators and players, reduces maintenance cost, and enables faster delivery of new mechanics without engine rewrites.

## Business Objectives

- **Clarity for Players:** Present all empire metrics in one consistent interface with uniform terminology, icons, and messaging.
- **Speed for Content Teams:** Designers configure new mechanics through one toolset instead of juggling different rules for resources, stats, and populations.
- **Operational Stability:** Unified logging and history make it easier to monitor balance changes, spot anomalies, and communicate updates.
- **Future-Proofing:** The platform supports upcoming features (e.g., new resource groupings, custom capacities) without additional engineering layers.

## Key Performance Indicators

| KPI                    | Baseline Issue                                                     | Expected Improvement                                                   |
| ---------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Content iteration time | Designers need separate pipelines for stats, resources, population | Single configuration surface reduces hand-off cycles and errors        |
| UI Consistency defects | Multiple translation formats cause copy drift                      | One translation system removes duplicate logic and reduces regressions |
| Player comprehension   | Different panels and wording confuse new players                   | Unified resource HUD and hovercards improve onboarding clarity         |
| Maintenance overhead   | Parallel code paths for similar behaviour                          | One code path lowers cost of ownership and review burden               |

## Before vs. After

| Aspect               | Today                                            | After Migration                                          |
| -------------------- | ------------------------------------------------ | -------------------------------------------------------- |
| Data sources         | Separate registries with unique constraints      | One ResourceV2 registry covering every numeric track     |
| Visual presentation  | Distinct panels for resources, stats, population | Single ordered display with optional groupings           |
| Error handling       | Inconsistent rounding/shortfall rules            | Explicit per-effect reconciliation (Clamp/Pass/Reject)   |
| Project coordination | Ad-hoc documentation, high risk of drift         | Structured living documentation with mandatory handovers |

## Benefits to Stakeholders

- **Management Team:** Reduced risk of divergent implementations, clear launch checklist, and confidence that regressions are tracked deliberately during migration.
- **Product Owners:** Simplified roadmap planning—new mechanics plug into ResourceV2 without bespoke engineering. Easier to reason about global action costs and player-facing behaviour.
- **Project Managers:** Strong governance via living documentation, structured work logs, and explicit handovers; easier to schedule and audit progress.
- **Design & Narrative Teams:** Freed from technical quirks (e.g., citizens vs. roles) and empowered to focus on creative content with predictable tools.

## Risks & Mitigation

- **Temporary Regressions:** Migration intentionally breaks legacy screens while new systems slot in. Mitigated by a living document that records accepted regressions and expected resolution.
- **Knowledge Transfer:** High complexity requires every contributor to understand the full design. Addressed through mandatory reading instructions and structured handover notes.
- **Scope Creep:** Out-of-scope features (multi-track tiering, context-aware hooks) are explicitly documented to prevent distraction.

## Timeline & Milestones

1. **Documentation & Alignment (current):** Establish design, stakeholder communication, and contributor process.
2. **System Build-Out:** Implement ResourceV2 infrastructure across engine, content, protocol, and UI scaffolding.
3. **Incremental Migration:** Move existing resources/statistics/population roles one by one, documenting regressions and removing legacy code per resource.
4. **Stabilisation & Launch:** Execute functional and regression test suites, complete cleanup checklist, and publish final architecture notes.

## Success Criteria

- Every numeric value in the game is powered by ResourceV2 with no reliance on legacy systems.
- UI shows a single, coherent resource presentation with accurate breakdowns where configured.
- Content teams can configure global costs, tiering, and group behaviours without code changes.
- Post-production checklist passes (functional validation, regression assurance, cleanup tasks) prior to launch.

This document should equip non-technical stakeholders with a clear understanding of why the Resource Migration project exists, what benefits it delivers, and how success will be measured.
