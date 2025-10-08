export type ActionLogLineKind =
	| 'headline'
	| 'group'
	| 'subaction'
	| 'effect'
	| 'cost'
	| 'cost-detail'
	| 'change';

export interface ActionLogLineDescriptor {
	text: string;
	depth: number;
	kind: ActionLogLineKind;
	refId?: string;
}
