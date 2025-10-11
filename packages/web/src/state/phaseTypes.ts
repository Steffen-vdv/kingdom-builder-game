export type PhaseStep = {
	title: string;
	items: { text: string; italic?: boolean; done?: boolean }[];
	active: boolean;
};
