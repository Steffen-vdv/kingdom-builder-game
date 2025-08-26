import { runAllTests } from "./index";

const results = runAllTests();
for (const r of results) {
  console.log(`${r.ok ? "✅" : "❌"} ${r.name} -> ${r.details}`);
}
const allPassed = results.every(r => r.ok);
if (!allPassed) {
  process.exitCode = 1;
}
