import type { TestCase, TestResult } from "./types";
import stepAB from "./stepAB";

export { type TestCase, type TestResult } from "./types";

export const testCases: TestCase[] = [...stepAB];

export function runAllTests(): TestResult[] {
  return testCases.map(tc => {
    const { ok, details } = tc.run();
    return { name: tc.name, ok, details };
  });
}
