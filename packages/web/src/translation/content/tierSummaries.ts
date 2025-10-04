const HAPPINESS_TIER_SUMMARIES: Record<string, string> = {
	'happiness.tier.summary.despair':
		'💰 Income -50%. ⏭️ Skip Growth. 🛡️ War Recovery skipped.',
	'happiness.tier.summary.misery':
		'💰 Income -50%. ⏭️ Skip Growth while morale is desperate.',
	'happiness.tier.summary.grim':
		'💰 Income -25%. ⏭️ Skip Growth until spirits recover.',
	'happiness.tier.summary.unrest': '💰 Income -25% while unrest simmers.',
	'happiness.tier.summary.steady':
		'Morale is steady. No tier bonuses are active.',
	'happiness.tier.summary.content':
		'💰 Income +20% while the realm is content.',
	'happiness.tier.summary.joyful':
		'💰 Income +25%. 🏛️ Building costs reduced by 20%.',
	'happiness.tier.summary.elated':
		'💰 Income +50%. 🏛️ Building costs reduced by 20%.',
	'happiness.tier.summary.ecstatic':
		'💰 Income +50%. 🏛️ Building costs reduced by 20%. 📈 Growth +20%.',
};

export function translateTierSummary(
	token: string | undefined,
): string | undefined {
	if (!token) {
		return undefined;
	}
	return HAPPINESS_TIER_SUMMARIES[token];
}

export function hasTierSummaryTranslation(token: string | undefined): boolean {
	return Boolean(token && token in HAPPINESS_TIER_SUMMARIES);
}

export { HAPPINESS_TIER_SUMMARIES };
