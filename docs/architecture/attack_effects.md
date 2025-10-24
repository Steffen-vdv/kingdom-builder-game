# Attack Effect Stat Annotations

The `attack:perform` effect now expects content authors to describe the combat
statistics used during formatting. This keeps the UI adaptable when new combat
systems are introduced.

## Declaring combat stats

Use the builder helpers to annotate each role:

```ts
effect('attack', 'perform').params(
	attackParams()
		.powerStat(Stat.armyStrength)
		.absorptionResource(ResourceV2Id.Absorption)
		.fortificationStat(Stat.fortificationStrength)
		.targetResource(Resource.castleHP),
);
```

Each call stores a stat descriptor in the effect definition. The formatter reads
these descriptors to render summaries, descriptions, and logs. You can override
the icon or label with optional overrides:

```ts
.powerStat('custom:valor' as StatKey, { icon: '⚔️', label: 'Valor' })
```

When no descriptors are provided, the formatter falls back to the legacy
`army/absorption/fortification` trio for backward compatibility. Supplying a
subset is also supported; missing roles are rendered with generic text instead
of icons.

## Test considerations

Synthetic content used in tests should register custom stat IDs (via the
`attackParams().powerStat(...)` helpers) to ensure formatting logic remains
robust. Avoid asserting against hard-coded `⚔️/🌀/🛡️` icons; derive expectations
from the annotated stat metadata instead.
