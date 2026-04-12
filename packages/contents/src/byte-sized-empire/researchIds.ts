/**
 * Byte-Sized Empire — Research Action IDs
 *
 * All 36 research technologies organized by tier.
 * T1 techs are available immediately; T2 requires 2 completed
 * T1 techs; T3 requires 2 completed T2 techs.
 */

type ValueOf<T> = T[keyof T];

export const ResearchT1 = {
	agriculture: 'research:bse:agriculture',
	masonry: 'research:bse:masonry',
	commerce: 'research:bse:commerce',
	writing: 'research:bse:writing',
	mysticism: 'research:bse:mysticism',
	warfare: 'research:bse:warfare',
	animalHusbandry: 'research:bse:animal-husbandry',
	pottery: 'research:bse:pottery',
	herbalism: 'research:bse:herbalism',
	metalworking: 'research:bse:metalworking',
	sailing: 'research:bse:sailing',
	folklore: 'research:bse:folklore',
} as const;

export type ResearchT1 = ValueOf<typeof ResearchT1>;

export const ResearchT2 = {
	cropRotation: 'research:bse:crop-rotation',
	architecture: 'research:bse:architecture',
	banking: 'research:bse:banking',
	philosophy: 'research:bse:philosophy',
	theology: 'research:bse:theology',
	tactics: 'research:bse:tactics',
	medicine: 'research:bse:medicine',
	engineering: 'research:bse:engineering',
	diplomacy: 'research:bse:diplomacy',
	guildSystem: 'research:bse:guild-system',
	navigation: 'research:bse:navigation',
	pageantry: 'research:bse:pageantry',
} as const;

export type ResearchT2 = ValueOf<typeof ResearchT2>;

export const ResearchT3 = {
	industrialRevolution: 'research:bse:industrial-revolution',
	university: 'research:bse:university',
	grandCathedral: 'research:bse:grand-cathedral',
	militaryAcademy: 'research:bse:military-academy',
	tradeEmpire: 'research:bse:trade-empire',
	greatHospital: 'research:bse:great-hospital',
	constitution: 'research:bse:constitution',
	masterPlan: 'research:bse:master-plan',
	renaissance: 'research:bse:renaissance',
	grandMonument: 'research:bse:grand-monument',
	philosophersStone: 'research:bse:philosophers-stone',
	manifestDestiny: 'research:bse:manifest-destiny',
} as const;

export type ResearchT3 = ValueOf<typeof ResearchT3>;

export const ResearchId = {
	...ResearchT1,
	...ResearchT2,
	...ResearchT3,
} as const;

export type ResearchId = ValueOf<typeof ResearchId>;

export const RESEARCH_T1_IDS: readonly ResearchT1[] = [
	ResearchT1.agriculture,
	ResearchT1.masonry,
	ResearchT1.commerce,
	ResearchT1.writing,
	ResearchT1.mysticism,
	ResearchT1.warfare,
	ResearchT1.animalHusbandry,
	ResearchT1.pottery,
	ResearchT1.herbalism,
	ResearchT1.metalworking,
	ResearchT1.sailing,
	ResearchT1.folklore,
];

export const RESEARCH_T2_IDS: readonly ResearchT2[] = [
	ResearchT2.cropRotation,
	ResearchT2.architecture,
	ResearchT2.banking,
	ResearchT2.philosophy,
	ResearchT2.theology,
	ResearchT2.tactics,
	ResearchT2.medicine,
	ResearchT2.engineering,
	ResearchT2.diplomacy,
	ResearchT2.guildSystem,
	ResearchT2.navigation,
	ResearchT2.pageantry,
];

export const RESEARCH_T3_IDS: readonly ResearchT3[] = [
	ResearchT3.industrialRevolution,
	ResearchT3.university,
	ResearchT3.grandCathedral,
	ResearchT3.militaryAcademy,
	ResearchT3.tradeEmpire,
	ResearchT3.greatHospital,
	ResearchT3.constitution,
	ResearchT3.masterPlan,
	ResearchT3.renaissance,
	ResearchT3.grandMonument,
	ResearchT3.philosophersStone,
	ResearchT3.manifestDestiny,
];

export const ALL_RESEARCH_IDS: readonly ResearchId[] = [...RESEARCH_T1_IDS, ...RESEARCH_T2_IDS, ...RESEARCH_T3_IDS];
