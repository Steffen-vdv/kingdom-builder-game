export type TestResult = { name: string; ok: boolean; details: string };

export type TestCase = {
  name: string;
  run: () => { ok: boolean; details: string };
};
