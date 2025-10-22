import type { ActionId } from '../../../actions';
import type { DevelopmentIdParam } from '../actionEffectGroups';
import { ParamsBuilder } from '../../builderShared';

const DEVELOPMENT_ID_DUPLICATE = 'You already set id() for this development effect. Remove the duplicate id() call.';
const DEVELOPMENT_LAND_ID_DUPLICATE = 'You already chose a landId() for this development effect. Remove the duplicate landId() call.';
const DEVELOPMENT_MISSING_ID = 'Development effect is missing id(). Call id("your-development-id") so the engine knows which development to reference.';

const BUILDING_ID_DUPLICATE = 'Building effect params already set id(). Remove the extra id() call.';
const BUILDING_LAND_ID_DUPLICATE = 'Building effect params already set landId(). Remove the extra landId() call.';
const BUILDING_MISSING_ID = 'Building effect params is missing id(). Call id("your-building-id") before build().';

const ACTION_ID_DUPLICATE = 'Action effect params already set id(). Remove the extra id() call.';
const ACTION_LAND_ID_DUPLICATE = 'Action effect params already set landId(). Remove the extra landId() call.';
const ACTION_MISSING_ID = 'Action effect params is missing id(). Call id("your-action-id") before build().';

class DevelopmentEffectParamsBuilder extends ParamsBuilder<{
	id?: DevelopmentIdParam;
	landId?: string;
}> {
	id(id: DevelopmentIdParam) {
		return this.set('id', id, DEVELOPMENT_ID_DUPLICATE);
	}
	landId(landId: string) {
		return this.set('landId', landId, DEVELOPMENT_LAND_ID_DUPLICATE);
	}
	override build() {
		if (!this.wasSet('id')) {
			throw new Error(DEVELOPMENT_MISSING_ID);
		}
		return super.build();
	}
}

class BuildingEffectParamsBuilder extends ParamsBuilder<{
	id?: string;
	landId?: string;
}> {
	id(id: string) {
		return this.set('id', id, BUILDING_ID_DUPLICATE);
	}
	landId(landId: string) {
		return this.set('landId', landId, BUILDING_LAND_ID_DUPLICATE);
	}
	override build() {
		if (!this.wasSet('id')) {
			throw new Error(BUILDING_MISSING_ID);
		}
		return super.build();
	}
}

class ActionEffectParamsBuilder extends ParamsBuilder<{
	id?: string;
	landId?: string;
}> {
	id(id: ActionId): this;
	id(id: string): this;
	id(id: string) {
		return this.set('id', id, ACTION_ID_DUPLICATE);
	}
	landId(landId: string) {
		return this.set('landId', landId, ACTION_LAND_ID_DUPLICATE);
	}
	override build() {
		if (!this.wasSet('id')) {
			throw new Error(ACTION_MISSING_ID);
		}
		return super.build();
	}
}

class LandEffectParamsBuilder extends ParamsBuilder<{
	count?: number;
	landId?: string;
}> {
	count(count: number) {
		return this.set('count', count);
	}
	landId(landId: string) {
		return this.set('landId', landId);
	}
}

export function developmentParams() {
	return new DevelopmentEffectParamsBuilder();
}

export function buildingParams() {
	return new BuildingEffectParamsBuilder();
}

export function actionParams() {
	return new ActionEffectParamsBuilder();
}

export function landParams() {
	return new LandEffectParamsBuilder();
}
