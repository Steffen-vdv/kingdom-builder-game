export type ResourceSourceEntry = {
	icons: string;
	mods: string;
};

export type PassiveDescriptor = {
	icon?: string;
	meta?: { source?: { icon?: string } };
};

export type PassiveModifierMap = Map<string, Map<string, unknown>>;
