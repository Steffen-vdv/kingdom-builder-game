# Content Domain Guide

This guide explains the structure of `@kingdom-builder/contents` and how to
maintain it properly. **Read this before making any changes to the content
domain.**

---

## Overview

The content domain defines all game data: actions, buildings, developments,
resources, phases, and rules. It is designed to be maintained by **non-technical
content creators** using a fluent builder pattern.

**The golden rule**: Content files should read like configuration, not code.

---

## Directory Structure

```
packages/contents/src/
├── actions.ts           # All action definitions (30+ actions)
├── buildings.ts         # All building definitions (12 buildings)
├── developments.ts      # Development definitions
├── resources.ts         # All resource definitions
├── phases.ts            # Game phase definitions
├── rules.ts             # Game rules export
├── rules.config.ts      # Rule configuration values
├── actionCategories.ts  # Action category definitions
├── actionIds.ts         # Action ID constants
├── buildingIds.ts       # Building ID constants
├── constants.ts         # Unified constants (ResourceId, etc.)
│
├── resource/            # Resource system exports (types, builders, registry)
│   └── index.ts         # Barrel export for resource infrastructure
│
├── internal/            # Internal type exports (Resource, Stat, PopulationRole)
│
├── registries/          # Registry exports
│
└── infrastructure/      # TECHNICAL CODE - DO NOT ADD GAME DATA HERE
    ├── builders.ts      # Builder function exports
    ├── builderShared.ts # Shared constants (Types, Methods)
    ├── builders/        # Builder implementations
    ├── helpers/         # Technical helper functions
    └── resource/        # Resource system infrastructure (builders, types, registry)
```

---

## Content Files vs Infrastructure Files

### Content Files (Top-level `.ts` files)

These define **game data** using builder patterns:

- `actions.ts` - Action definitions
- `buildings.ts` - Building definitions
- `developments.ts` - Development definitions
- `resources.ts` - Resource definitions
- `phases.ts` - Phase definitions

**Rules for content files:**

1. **Use only builder patterns** - No helper functions, no loops, no conditionals
2. **Inline all values** - Don't extract into variables (except shared requirements)
3. **Accept duplication** - Copy-paste is better than abstraction
4. **No imports from `./infrastructure/` subdirectories** - Only import from
   `./infrastructure/builders` and `./infrastructure/builderShared`

### Infrastructure Files (`infrastructure/` directory)

These contain **technical code** that powers the builders:

- Builder implementations
- Type definitions
- Helper functions for complex operations
- Lazy-loading code for circular dependencies

**Non-technical content creators should never need to touch these files.**

---

## How to Add Game Content

### Adding a New Action

Open `actions.ts` and add a new `registry.add()` call:

```typescript
registry.add(
	ActionIdValues.my_new_action,
	action()
		.id(ActionIdValues.my_new_action)
		.name('My New Action')
		.icon('🎯')
		.cost(Resource.gold, 5)
		.effect(
			effect(Types.Resource, ResourceMethods.ADD)
				.params(resourceAmountChange(Resource.happiness, 2))
				.build(),
		)
		.category(ActionCategory.Basic)
		.order(10)
		.focus(Focus.Economy)
		.build(),
);
```

Don't forget to add the ID to `actionIds.ts` first.

### Adding a New Building

Open `buildings.ts` and add a new `registry.add()` call:

```typescript
registry.add(
	BuildingId.MyBuilding,
	building()
		.id(BuildingId.MyBuilding)
		.name('My Building')
		.icon('🏛️')
		.cost(Resource.gold, 10)
		.focus(Focus.Economy)
		.build(),
);
```

Don't forget to add the ID to `buildingIds.ts` first.

---

## Anti-Patterns to Avoid

### ❌ DON'T: Create helper functions in content files

```typescript
// BAD - Don't do this in actions.ts or buildings.ts
function createStandardAction(name: string, cost: number) {
	return action().name(name).cost(Resource.gold, cost).build();
}
```

### ❌ DON'T: Use loops to generate content

```typescript
// BAD - Don't do this
const items = [
	['A', 1],
	['B', 2],
];
items.forEach(([name, cost]) => {
	registry.add(name, action().name(name).cost(Resource.gold, cost).build());
});
```

### ❌ DON'T: Extract data into variables

```typescript
// BAD - Don't do this
const MY_COST = 5;
const MY_ICON = '🎯';
registry.add(id, action().cost(Resource.gold, MY_COST).icon(MY_ICON).build());
```

### ✅ DO: Write each definition inline and complete

```typescript
// GOOD - Inline, self-contained, readable
registry.add(
	ActionIdValues.expand,
	action()
		.id(ActionIdValues.expand)
		.name('Expand')
		.icon('🌱')
		.cost(Resource.gold, 2)
		.effect(effect(Types.Land, LandMethods.ADD).param('count', 1).build())
		.category(ActionCategory.Basic)
		.order(1)
		.focus(Focus.Economy)
		.build(),
);
```

---

## Acceptable Exceptions

### Shared Requirements

Requirements that are used by multiple actions can be defined once at the top of
the file:

```typescript
// This is OK - shared requirement used by multiple actions
const developmentSlotRequirement = compareRequirement()
	.left(landEvaluator())
	.operator('gt')
	.right(0)
	.message('Requires an available development slot.')
	.build();
```

### Effect Groups

Complex effect groups that are used inline can be defined before their action:

```typescript
// This is OK - immediately used by the following action
const royalDecreeDevelopGroup = actionEffectGroup('royal_decree_develop')
	.layout('compact')
	.option(/* ... */)
	.option(/* ... */);

registry.add(
	ActionIdValues.royal_decree,
	action()
		/* ... */
		.effectGroup(royalDecreeDevelopGroup)
		.build(),
);
```

---

## Why This Structure?

1. **Readability**: Content creators can understand the game data at a glance
2. **Maintainability**: Each definition is self-contained and easy to modify
3. **IDE Support**: Builder patterns provide autocomplete and type checking
4. **No Hidden Logic**: What you see is what you get - no magic transformations
5. **Separation of Concerns**: Technical complexity is isolated in infrastructure

---

## Updating Infrastructure

If you need to add a new builder method or modify the builder system:

1. Make changes in `infrastructure/builders/` or `infrastructure/helpers/`
2. Export new functions from `infrastructure/builders.ts`
3. Update this guide if the API changes
4. **Never add game data to infrastructure files**

---

## Questions?

If you're unsure whether something belongs in content or infrastructure, ask
yourself:

> "Would a game designer understand this code?"

- **Yes** → Put it in a content file using builders
- **No** → Put it in infrastructure and expose it through builders
