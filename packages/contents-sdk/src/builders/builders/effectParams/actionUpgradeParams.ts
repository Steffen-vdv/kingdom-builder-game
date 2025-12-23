import type { ActionId } from '../../../actions';
import type { MetaCategoryValue } from '../../../constants';
import { ParamsBuilder } from '../../builderShared';

const TARGET_ACTION_DUPLICATE = 'Action upgrade params already set targetAction(). ' + 'Remove the extra targetAction() call.';

const RANDOM_META_CATEGORY_DUPLICATE = 'Action upgrade params already set randomInMetaCategory(). ' + 'Remove the extra randomInMetaCategory() call.';

const NO_TARGET_SPECIFIED = 'Action upgrade params must specify either targetAction() or ' + 'randomInMetaCategory() before build().';

const BOTH_TARGETS_SPECIFIED = 'Action upgrade params cannot specify both targetAction() and ' + 'randomInMetaCategory(). Choose one targeting mode.';

/**
 * Parameters for the action:upgrade effect.
 */
export interface ActionUpgradeEffectParams {
	/** Specific action to upgrade */
	targetAction?: string;
	/** Meta-category to randomly select an upgradeable action from */
	randomInMetaCategory?: string;
	[key: string]: unknown;
}

class ActionUpgradeParamsBuilder extends ParamsBuilder<ActionUpgradeEffectParams> {
	/**
	 * Targets a specific action to upgrade.
	 * @param actionId The action ID to upgrade
	 */
	targetAction(actionId: ActionId): this;
	targetAction(actionId: string): this;
	targetAction(actionId: string): this {
		if (this.wasSet('randomInMetaCategory')) {
			throw new Error(BOTH_TARGETS_SPECIFIED);
		}
		return this.set('targetAction', actionId, TARGET_ACTION_DUPLICATE);
	}

	/**
	 * Randomly selects an upgradeable action from the specified meta-category.
	 * @param metaCategory The meta-category to select from
	 */
	randomInMetaCategory(metaCategory: MetaCategoryValue): this {
		if (this.wasSet('targetAction')) {
			throw new Error(BOTH_TARGETS_SPECIFIED);
		}
		return this.set('randomInMetaCategory', metaCategory, RANDOM_META_CATEGORY_DUPLICATE);
	}

	override build(): ActionUpgradeEffectParams {
		if (!this.wasSet('targetAction') && !this.wasSet('randomInMetaCategory')) {
			throw new Error(NO_TARGET_SPECIFIED);
		}
		return super.build();
	}
}

/**
 * Creates a new action upgrade params builder.
 * Use with effect(Types.Action, ActionMethods.UPGRADE).
 */
export function actionUpgradeParams(): ActionUpgradeParamsBuilder {
	return new ActionUpgradeParamsBuilder();
}
