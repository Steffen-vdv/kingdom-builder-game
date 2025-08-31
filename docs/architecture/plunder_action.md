# Plunder System Action

The engine includes a `plunder` system action that leverages a generic
`resource:transfer` effect to move gold from the defender to the attacker.

- **Base percentage** – 25 % of the defender's gold is transferred.
- **Modifiers** – Passives can adjust the percentage by registering a
  `result_mod` with `evaluation: { type: 'transfer_pct', id: 'percent' }` and an
  `adjust` value. Positive values increase the share while negative values reduce
  it.

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

This structure allows future content such as a **Raider's Guild** to grant extra
plunder automatically when the action resolves.
