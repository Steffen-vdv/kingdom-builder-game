# Attack Effect Combat Resource Annotations

The `attack:perform` effect expects content authors to describe the combat
resources used during formatting. This keeps the UI adaptable when new combat
systems are introduced.

> **Note:** Combat resources (army strength, absorption, fortification) are part
> of the unified ResourceV2 system. The builder API uses "Stat" in method names
> for historical reasons, but these are treated as resources throughout the
> engine and UI.

## Declaring combat resources

Use the builder helpers to annotate each role:

```ts
effect('attack', 'perform').params(
	attackParams()
		.powerStat(Stat.armyStrength)
		.absorptionStat(Stat.absorption)
		.fortificationStat(Stat.fortificationStrength)
		.targetResource(Resource.castleHP),
);
```

Each call stores a resource descriptor in the effect definition. The formatter
reads these descriptors to render summaries, descriptions, and logs. You can
override the icon or label with optional overrides:

```ts
.powerStat('custom:valor' as StatKey, { icon: '⚔️', label: 'Valor' })
```

When no descriptors are provided, the formatter falls back to the default
`army/absorption/fortification` resources. Supplying a subset is also supported;
missing roles are rendered with generic text instead of icons.

## Test considerations

Synthetic content used in tests should register custom resource IDs (via the
`attackParams().powerStat(...)` helpers) to ensure formatting logic remains
robust. Avoid asserting against hard-coded `⚔️/🌀/🛡️` icons; derive expectations
from the annotated resource metadata instead.
