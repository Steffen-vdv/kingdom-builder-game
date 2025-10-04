export interface EvaluatorDef<
	P extends Record<string, unknown> = Record<string, unknown>,
> {
	type: string;
	params?: P | undefined;
}
