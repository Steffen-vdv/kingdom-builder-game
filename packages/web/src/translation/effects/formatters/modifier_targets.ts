import type { EffectDef, ActionConfig } from '@kingdom-builder/protocol';
import { formatTargetLabel, formatGainFrom } from './modifier_helpers';
import type { ResultModifierLabel } from './modifier_helpers';
import type { TranslationContext } from '../../context';
import { resolvePopulationDisplay } from '../helpers';

export function formatPopulation(
	label: ResultModifierLabel,
	effectDefinition: EffectDef,
	evaluation: { id: string },
	translationContext: TranslationContext,
	detailed: boolean,
) {
	const { icon, name } = getActionInfo(translationContext, evaluation.id);
	const amount = Number(effectDefinition.params?.['amount'] ?? 0);
	const populationDisplay = resolvePopulationDisplay(
		translationContext,
		undefined,
	);
	const populationIcon =
		populationDisplay.icon || populationDisplay.label || '👥';
	const populationLabel = populationDisplay.label || 'Population';
	const targetDescription = `${populationIcon} ${populationLabel} through ${formatTargetLabel(
		icon,
		name,
	)}`;
	return formatGainFrom(
		label,
		{
			summaryTargetIcon: populationIcon,
			summaryContextIcon: icon,
			description: targetDescription,
		},
		amount,
		translationContext,
		{ detailed },
	);
}

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
		return { icon: id, name: id };
	}
}
