import { createEngine, runDevelopment, performAction } from "../src/engine";
import type { TestCase } from "./types";

const stepAB: TestCase[] = [
  {
    name: "Expand baseline: costs 2g/1ap, +1 land, +1 happiness (no upkeep in this test)",
    run() {
      const ctx = createEngine();
      runDevelopment(ctx);
      const goldBefore = ctx.me.gold;
      const apBefore = ctx.me.ap;
      const landsBefore = ctx.me.lands.length;
      const hapBefore = ctx.me.happiness;
      performAction("expand", ctx);
      const ok =
        ctx.me.gold === goldBefore - 2 &&
        ctx.me.ap === apBefore - 1 &&
        ctx.me.lands.length === landsBefore + 1 &&
        ctx.me.happiness === hapBefore + 1;
      return {
        ok,
        details: `gold ${goldBefore}->${ctx.me.gold}, ap ${apBefore}->${ctx.me.ap}, lands ${landsBefore}->${ctx.me.lands.length}, happy ${hapBefore}->${ctx.me.happiness}`,
      };
    },
  },
  {
    name: "Expand with Town Charter: costs +2 gold, +1 extra happiness (no upkeep in this test)",
    run() {
      const ctx = createEngine();
      runDevelopment(ctx);
      performAction("build_town_charter", ctx);
      ctx.me.ap += 1;
      const goldBefore = ctx.me.gold;
      const apBefore = ctx.me.ap;
      const hapBefore = ctx.me.happiness;
      performAction("expand", ctx);
      const expectedGoldCost = 2 + 2;
      const ok =
        ctx.me.gold === goldBefore - expectedGoldCost &&
        ctx.me.ap === apBefore - 1 &&
        ctx.me.happiness === hapBefore + 2;
      return {
        ok,
        details: `gold ${goldBefore}->${ctx.me.gold} (expected -${expectedGoldCost}), ap ${apBefore}->${ctx.me.ap}, happy ${hapBefore}->${ctx.me.happiness}`,
      };
    },
  },
  {
    name: "Two Expands with Town Charter: costs and happiness scale properly (no upkeep in this test)",
    run() {
      const ctx = createEngine();
      runDevelopment(ctx);
      performAction("build_town_charter", ctx);
      ctx.me.ap += 2;
      ctx.me.gold += 10;
      const goldBefore = ctx.me.gold;
      const hapBefore = ctx.me.happiness;
      const landsBefore = ctx.me.lands.length;
      performAction("expand", ctx);
      performAction("expand", ctx);
      const totalCost = (2 + 2) * 2;
      const ok =
        ctx.me.gold === goldBefore - totalCost &&
        ctx.me.happiness === hapBefore + 4 &&
        ctx.me.lands.length === landsBefore + 2;
      return {
        ok,
        details: `gold ${goldBefore}->${ctx.me.gold} (expected -${totalCost}), happy ${hapBefore}->${ctx.me.happiness}, lands ${landsBefore}->${ctx.me.lands.length}`,
      };
    },
  },
];

export default stepAB;
