# Effect Registry

The engine resolves action effects through handler functions stored in the `EFFECTS` registry.
Each handler implements the `EffectHandler` interface and is invoked with the raw effect
definition and current `EngineContext`.

Core handlers (`add_land`, `add_resource`, `add_building`) are registered during engine
bootstrap via `registerCoreEffects()`.

To add a new effect from outside the engine, register a handler before performing actions:

```ts
import { EFFECTS } from "./effects"; // adjust path as needed

EFFECTS.add("heal_castle", (effect, ctx) => {
  const amt = effect.params?.amount ?? 0;
  ctx.me.resources["castleHP"] += amt;
});
```

Once registered, any action can reference `type: "heal_castle"` in its effects list.
