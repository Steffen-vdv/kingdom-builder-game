import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import App from '../src/App';

vi.mock('@kingdom-builder/engine', () => ({
  createEngine: () => ({}),
}));

describe('<App />', () => {
  it('renders hello world', () => {
    const html = renderToString(<App />);
    expect(html).toContain('Hello World');
  });
});
