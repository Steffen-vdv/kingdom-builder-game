import type { EffectHandler } from '../../effects';
import { isResourceV2ValueChangeEffect } from './value_change';

export { isResourceV2ValueChangeEffect } from './value_change';
export { resourceV2AddHandler, resourceV2RemoveHandler } from './value_change';

export function createResourceV2AwareHandler(
	legacy: EffectHandler,
	resourceV2: EffectHandler,
): EffectHandler {
	return (effect, context, mult) => {
		if (isResourceV2ValueChangeEffect(effect)) {
			resourceV2(effect, context, mult);
			return;
		}
		legacy(effect, context, mult);
	};
}
