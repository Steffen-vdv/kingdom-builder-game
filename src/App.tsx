import React, { useEffect, useState } from "react";
import { createEngine, runDevelopment, performAction } from "./engine";

type TestResult = { name: string; ok: boolean; details: string };

function runTests(): TestResult[] {
  const results: TestResult[] = [];

  // Test 1: Expand baseline (no Town Charter)
  {
    const ctx = createEngine();
    runDevelopment(ctx); // grants 1 AP
    const goldBefore = ctx.me.gold,
      apBefore = ctx.me.ap,
      landsBefore = ctx.me.lands.length,
      hapBefore = ctx.me.happiness;
    performAction("expand", ctx);
    const ok =
      ctx.me.gold === goldBefore - 2 &&
      ctx.me.ap === apBefore - 1 &&
      ctx.me.lands.length === landsBefore + 1 &&
      ctx.me.happiness === hapBefore + 1;
    results.push({
      name: "Expand baseline: costs 2g/1ap, +1 land, +1 happiness (no upkeep in this test)",
      ok,
      details: `gold ${goldBefore}->${ctx.me.gold}, ap ${apBefore}->${ctx.me.ap}, lands ${landsBefore}->${ctx.me.lands.length},` +
        ` happy ${hapBefore}->${ctx.me.happiness}`,
    });
  }

  // Test 2: Build Town Charter, then Expand (cost +2g, +1 extra happiness)
  {
    const ctx = createEngine();
    runDevelopment(ctx); // 1 AP
    performAction("build_town_charter", ctx); // pay 5g, ap-1; registers passives
    ctx.me.ap += 1; // allow another action
    const goldBefore = ctx.me.gold, apBefore = ctx.me.ap, hapBefore = ctx.me.happiness;
    performAction("expand", ctx);
    const expectedGoldCost = 2 + 2; // base + surcharge from Town Charter
    const ok =
      ctx.me.gold === goldBefore - expectedGoldCost &&
      ctx.me.ap === apBefore - 1 &&
      ctx.me.happiness === hapBefore + 2;
    results.push({
      name: "Expand with Town Charter: costs +2 gold, +1 extra happiness (no upkeep in this test)",
      ok,
      details: `gold ${goldBefore}->${ctx.me.gold} (expected -${expectedGoldCost}), ap ${apBefore}->${ctx.me.ap}, happy ${hapBefore}->${ctx.me.happiness}`,
    });
  }

  // Test 3: Multiple Expands stack modifiers consistently
  {
    const ctx = createEngine();
    runDevelopment(ctx);
    performAction("build_town_charter", ctx);
    ctx.me.ap += 2; // allow two expands
    ctx.me.gold += 10; // top-up to afford two expands
    const goldBefore = ctx.me.gold, hapBefore = ctx.me.happiness, landsBefore = ctx.me.lands.length;
    performAction("expand", ctx);
    performAction("expand", ctx);
    const totalCost = (2 + 2) * 2; // two expands with surcharge
    const ok =
      ctx.me.gold === goldBefore - totalCost &&
      ctx.me.happiness === hapBefore + 4 &&
      ctx.me.lands.length === landsBefore + 2;
    results.push({
      name: "Two Expands with Town Charter: costs and happiness scale properly (no upkeep in this test)",
      ok,
      details: `gold ${goldBefore}->${ctx.me.gold} (expected -${totalCost}), happy ${hapBefore}->${ctx.me.happiness}, lands ${landsBefore}->${ctx.me.lands.length}`,
    });
  }

  return results;
}

export default function App() {
  const [results, setResults] = useState<TestResult[]>([]);
  useEffect(() => {
    const res = runTests();
    console.clear();
    for (const r of res) console.log(`${r.ok ? "✅" : "❌"} ${r.name} → ${r.details}`);
    setResults(res);
  }, []);

  const passed = results.every(r => r.ok);
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">KB Engine — Step A+B Runner</h1>
      <p className="opacity-70">Proof slice with <b>Expand</b> action and <b>Town Charter</b> building, including PassiveManager hooks.</p>
      <div className="rounded-xl border p-4">
        <div className="font-semibold mb-2">Test Results</div>
        <ul className="list-disc pl-6 space-y-1">
          {results.map((r, i) => (
            <li key={i} className={r.ok ? "text-green-600" : "text-red-600"}>
              {r.ok ? "✅" : "❌"} {r.name}
              <div className="text-sm opacity-80">{r.details}</div>
            </li>
          ))}
        </ul>
        <div className={`mt-3 font-semibold ${passed ? "text-green-700" : "text-red-700"}`}>
          {passed ? "All tests passed" : "Some tests failed — see console for details"}
        </div>
      </div>
      <div className="text-xs opacity-60">
        Note: Step B tests intentionally skip Upkeep to isolate Expand/Charter behavior. We'll add dedicated Upkeep tests next.
      </div>
    </div>
  );
}
