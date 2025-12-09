import { describe, expect, it } from 'vitest';
import { passiveParams, effect } from '../src/config/builders';
import { Types, PassiveMethods } from '../src/config/builderShared';

const REMOVE_ON_UPKEEP_STEP_MESSAGE = 'Passive removeOnUpkeepStep() requires id(). ' + 'Call id("your-passive-id") before removeOnUpkeepStep().';

const REMOVE_ON_TRIGGER_MESSAGE = "Passive removeOnTrigger('onBeforeAttacked') requires id(). " + 'Call id("your-passive-id") before ' + "removeOnTrigger('onBeforeAttacked').";

describe('passive removal helpers', () => {
	it('errors when removeOnUpkeepStep() is used without id', () => {
		expect(() => passiveParams().removeOnUpkeepStep()).toThrowError(REMOVE_ON_UPKEEP_STEP_MESSAGE);
	});

	it('errors when removeOnTrigger() is used without id', () => {
		expect(() => passiveParams().removeOnTrigger('onBeforeAttacked')).toThrowError(REMOVE_ON_TRIGGER_MESSAGE);
	});

	it('matches manual upkeep removal wiring', () => {
		const manual = passiveParams().id('passive:manual').onPayUpkeepStep(effect(Types.Passive, PassiveMethods.REMOVE).param('id', 'passive:manual').build()).build();
		const helper = passiveParams().id('passive:manual').removeOnUpkeepStep().build();
		expect(helper).toEqual(manual);
	});

	it('matches manual trigger-based removal wiring', () => {
		const manual = passiveParams().id('passive:trigger').onBeforeAttacked(effect(Types.Passive, PassiveMethods.REMOVE).param('id', 'passive:trigger').build()).build();
		const helper = passiveParams().id('passive:trigger').removeOnTrigger('onBeforeAttacked').build();
		expect(helper).toEqual(manual);
	});
});
