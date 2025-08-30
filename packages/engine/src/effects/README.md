# Effect Registry

The engine resolves action effects through handler functions stored in the `EFFECTS` registry.
Each handler implements the `EffectHandler` interface and is keyed by a `type:method` pair
such as `resource:add` or `land:till`.

Core handlers are registered during engine bootstrap via `registerCoreEffects()`.

To add a new effect from outside the engine, register a handler before performing actions:

```ts
import { EFFECTS } from './effects'; // adjust path as needed

EFFECTS.add('castle:heal', (effect, ctx, mult) => {
  const amt = (effect.params?.amount ?? 0) * mult;
  ctx.activePlayer.resources['castleHP'] += amt;
});
```

Once registered, any action can reference `{ type: "castle", method: "heal", params: { amount: 5 } }`
in its effects list.

## Built-in modifiers

The core set also exposes `cost-mod` and `result-mod` handlers for temporary
hooks. A `cost-mod` effect adjusts the resource cost of a matching action. A
`result-mod` effect tweaks resolved values, either when a specific action runs
or when an evaluation such as `development:farm` produces resources. Modifiers
require a unique `id` and are automatically scoped to the owning player so
multiple copies of the same source do not conflict.
