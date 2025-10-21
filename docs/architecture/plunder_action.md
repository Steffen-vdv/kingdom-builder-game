# Plunder System Action

The engine includes a `plunder` system action that leverages a generic
`resource:transfer` effect to move resources from the defender to the attacker.

- **Base percentage** – 25 % of the defender's gold is transferred.
- **Modifiers** – Passives can adjust the percentage by registering a
  `result_mod` with `evaluation: { type: 'transfer_pct', id: 'percent' }` and an
  `adjust` value. Positive values increase the share while negative values reduce
  it.
  Transfers never exceed the defender's available gold; percentages above 100 %
  are clamped to the current balance.
- **Static amounts** – Content can transfer fixed amounts (such as happiness)
  using `amount(value)` instead of `percent(...)`. Result modifiers that target
  `transfer_amount:amount` can raise or lower the raw quantity before clamping
  to the defender's remaining resources.

Example modifier:

```ts
{
  type: 'result_mod',
  method: 'add',
  params: {
    id: 'raiders_guild_bonus',
    evaluation: { type: 'transfer_pct', id: 'percent' },
    adjust: 10, // transfer +10%
  },
}
```

Static amount modifier example:

```ts
{
  type: 'result_mod',
  method: 'add',
  params: {
    id: 'raiders_guild_happiness',
    evaluation: { type: 'transfer_amount', id: 'amount' },
    adjust: 1, // transfer +1 resource
  },
}
```

This structure allows future content such as a **Raider's Guild** to grant extra
plunder automatically when the action resolves.
