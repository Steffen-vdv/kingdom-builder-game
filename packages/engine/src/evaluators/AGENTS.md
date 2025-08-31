# Evaluator Registry

## 🚫 Hardcoded content prohibited

- **Engine and Web may not hardcode game data.** Evaluators must not assume specific resource or stat keys or depend on fixed values from the content package.
- **Tests may not rely on literals.** When testing evaluators, fetch ids and amounts from the Content domain or mocks so content changes do not break tests unless they expose unsupported scenarios.

Evaluators compute numbers used by effects and result modifiers to determine how
many times nested effects execute. They receive the evaluator definition and the
current `EngineContext`, and return a numeric multiplier.

Core evaluators are registered during engine bootstrap via
`registerCoreEvaluators()`. This populates the `EVALUATORS` registry with the
built-in `development` evaluator.

```ts
import { registerCoreEvaluators } from './evaluators'; // adjust path as needed

registerCoreEvaluators();
```

## Custom evaluators

To add a new evaluator from outside the engine, register a handler before
running effects:

```ts
import { EVALUATORS, EvaluatorHandler } from './evaluators'; // adjust path as needed

const doubleGold: EvaluatorHandler<number> = (def, ctx) =>
  ctx.activePlayer.resources['gold'] * 2;

EVALUATORS.add('doubleGold', doubleGold);
```

Once registered, effects can reference `{ evaluator: { type: 'doubleGold' }, effects: [...] }`.
