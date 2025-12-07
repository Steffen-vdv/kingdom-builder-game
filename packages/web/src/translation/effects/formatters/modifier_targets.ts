import type { ActionConfig } from '@kingdom-builder/protocol';
import type { TranslationContext } from '../../context';
import { humanizeIdentifier } from '../stringUtils';

export function getActionInfo(
	translationContext: TranslationContext,
	id: string,
) {
	try {
		const actionDefinition: ActionConfig = translationContext.actions.get(id);
		return {
			icon: actionDefinition.icon ?? id,
			name: actionDefinition.name ?? id,
		};
	} catch {
		const fallbackLabel = humanizeIdentifier(id) || id;
		return { icon: '', name: fallbackLabel };
	}
}
