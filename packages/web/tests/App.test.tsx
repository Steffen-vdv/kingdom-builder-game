/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

type Land = {
  id: string;
  slotsMax: number;
  slotsUsed: number;
  developments: string[];
};

type Player = {
  resources: { gold: number; ap: number; happiness: number; castleHP: number };
  stats: {
    maxPopulation: number;
    armyStrength: number;
    fortificationStrength: number;
    absorption: number;
  };
  buildings: Set<string>;
  lands: Land[];
  population: Record<string, number>;
};

type Ctx = { game: { active: Player }; populations: Map<string, unknown> };

type DevelopParams = { id: string; landId: string };

vi.mock('@kingdom-builder/engine', () => {
  const performAction = vi.fn(
    (id: string, ctx: Ctx, params?: DevelopParams) => {
      const p = ctx.game.active;
      if (id === 'stub') {
        p.resources.gold += 1;
      } else if (id === 'develop') {
        const land = p.lands.find((l) => l.id === params?.landId);
        if (!land || land.slotsUsed >= land.slotsMax)
          throw new Error('no slot');
        land.developments.push(params.id);
        land.slotsUsed += 1;
      }
    },
  );
  return {
    createEngine: () => ({
      actions: {
        map: new Map([
          ['stub', { id: 'stub', name: 'Stub' }],
          ['develop', { id: 'develop', name: 'Develop' }],
        ]),
      },
      game: {
        currentPhase: 'development',
        active: {
          resources: { gold: 0, ap: 30, happiness: 0, castleHP: 10 },
          stats: {
            maxPopulation: 1,
            armyStrength: 0,
            fortificationStrength: 0,
            absorption: 0,
          },
          buildings: new Set<string>(),
          lands: [{ id: 'l1', slotsMax: 1, slotsUsed: 0, developments: [] }],
          population: {},
        },
      },
      populations: new Map(),
      developments: new Map(),
      buildings: new Map(),
    }),
    performAction,
    Phase: { Development: 'development', Upkeep: 'upkeep', Main: 'main' },
    runEffects: vi.fn(),
    applyParamsToEffects: vi.fn(),
  };
});

import { performAction } from '@kingdom-builder/engine';

import App from '../src/App';

describe('<App /> interactions', () => {
  it('handles actions, phases and logging', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<App />);
    });

    // initial render includes header and phase button
    expect(container.textContent).toContain('testlab');
    const stubBtn = container.querySelector(
      'button[aria-label="perform stub"]',
    ) as HTMLButtonElement;
    const developBtnSelector = 'button[aria-label="perform develop"]';
    let developBtn = container.querySelector(
      developBtnSelector,
    ) as HTMLButtonElement;
    expect(stubBtn).toBeTruthy();
    expect(developBtn.disabled).toBe(false);

    // failure path
    performAction.mockImplementationOnce(() => {
      throw new Error('fail');
    });
    act(() => {
      stubBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.textContent).toContain('Action stub failed');

    // success path
    act(() => {
      stubBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.textContent).toContain(
      'Action stub succeeded — gold: 0 +1 => 1',
    );

    // develop action and disable state after use
    act(() => {
      developBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(
      container.textContent?.includes(
        'Action develop (farm on l1) succeeded — land l1 developments: 0 +1 => 1',
      ),
    ).toBe(true);
    developBtn = container.querySelector(
      developBtnSelector,
    ) as HTMLButtonElement;
    expect(developBtn.disabled).toBe(true);
    expect(developBtn.title).toBe(
      'no land with open development slot available',
    );

    // cycle through phases
    const phaseBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'next phase',
    ) as HTMLButtonElement;
    act(() => {
      phaseBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      phaseBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      phaseBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.textContent).toContain('upkeep phase');
    expect(container.textContent).toContain('main phase');
    expect(container.textContent).toContain('development phase');
  });
});
