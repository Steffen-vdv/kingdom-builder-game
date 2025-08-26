import { createEngine } from '@kingdom-builder/engine';

export default function App() {
  // Initialize the engine to verify package linkage
  createEngine();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Hello World</h1>
    </div>
  );
}
