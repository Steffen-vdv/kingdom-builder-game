import React, { useEffect, useState } from "react";
import { runAllTests, TestResult } from "../tests";

export default function App() {
  const [results, setResults] = useState<TestResult[]>([]);
  useEffect(() => {
    const res = runAllTests();
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
