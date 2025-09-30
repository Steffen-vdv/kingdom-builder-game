import {
  action,
  resourceParams,
  statParams,
  effect,
  requirement,
  passiveParams,
  attackParams,
  transferParams,
} from '../src/config/builders';
import { RESOURCES, type ResourceKey } from '../src/resources';
import { STATS, type StatKey } from '../src/stats';
import { describe, expect, it } from 'vitest';

const firstResourceKey = Object.keys(RESOURCES)[0] as ResourceKey;
const firstStatKey = Object.keys(STATS)[0] as StatKey;

describe('content builder safeguards', () => {
  it('explains when an action id is missing', () => {
    expect(() => action().name('Example').build()).toThrowError(
      "Action is missing id(). Call id('unique-id') before build().",
    );
  });

  it('blocks duplicate action ids', () => {
    expect(() => action().id('demo').id('again')).toThrowError(
      'Action already has an id(). Remove the extra id() call.',
    );
  });

  it('reports missing action names', () => {
    expect(() => action().id('example').build()).toThrowError(
      "Action is missing name(). Call name('Readable name') before build().",
    );
  });

  it('prevents mixing amount and percent for resource changes', () => {
    const params = resourceParams().key(firstResourceKey).amount(2);
    expect(() => params.percent(10)).toThrowError(
      'Resource change cannot use both amount() and percent(). Choose one of them.',
    );
  });

  it('requires an amount or percent for resource changes', () => {
    expect(() => resourceParams().key(firstResourceKey).build()).toThrowError(
      'Resource change needs exactly one of amount() or percent(). Pick how much the resource should change.',
    );
  });

  it('explains stat change conflicts clearly', () => {
    const params = statParams().key(firstStatKey).percent(10);
    expect(() => params.amount(1)).toThrowError(
      'Stat change cannot mix amount() with percent() or percentFromStat(). Pick one approach to describe the change.',
    );
  });

  it('flags empty effects', () => {
    expect(() => effect().build()).toThrowError(
      'Effect is missing type() and method(). Call effect(Types.X, Methods.Y) or add nested effect(...) calls before build().',
    );
  });

  it('guides requirement configuration mistakes', () => {
    expect(() => requirement().method('compare').build()).toThrowError(
      'Requirement is missing type(). Call type("your-requirement") before build().',
    );
  });

  it('requires passives to declare an id', () => {
    expect(() => passiveParams().build()).toThrowError(
      'Passive effect is missing id(). Call id("your-passive-id") so it can be referenced later.',
    );
  });

  it('ensures attacks have a single target', () => {
    expect(() => attackParams().build()).toThrowError(
      'Attack effect is missing a target. Call targetResource(...), targetStat(...), or targetBuilding(...) once.',
    );
  });

  it('supports building targets for attacks', () => {
    const params = attackParams().targetBuilding('test-building').build();
    expect(params).toEqual({
      target: { type: 'building', id: 'test-building' },
    });
  });

  it('demands transfer amounts', () => {
    expect(() => transferParams().key(firstResourceKey).build()).toThrowError(
      'Resource transfer is missing percent(). Call percent(amount) to choose how much to move.',
    );
  });
});
