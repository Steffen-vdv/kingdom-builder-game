import { compareRequirement } from '../src/config/builders';
import { describe, expect, it } from 'vitest';

type CompareBuilder = ReturnType<typeof compareRequirement>;

type ConfigureBuilder = (builder: CompareBuilder) => CompareBuilder;

const readOperator = (configure: ConfigureBuilder) => {
	const built = configure(compareRequirement().left(1).right(2)).build();
	const params = built.params as { operator: string };
	return params.operator;
};

describe('compare requirement helpers', () => {
	const cases: ReadonlyArray<{
		name: string;
		configure: ConfigureBuilder;
		expected: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'ne';
	}> = [
		{
			name: 'lessThan',
			configure: (builder) => builder.lessThan(),
			expected: 'lt',
		},
		{
			name: 'lessThanOrEqual',
			configure: (builder) => builder.lessThanOrEqual(),
			expected: 'lte',
		},
		{
			name: 'greaterThan',
			configure: (builder) => builder.greaterThan(),
			expected: 'gt',
		},
		{
			name: 'greaterThanOrEqual',
			configure: (builder) => builder.greaterThanOrEqual(),
			expected: 'gte',
		},
		{
			name: 'equalTo',
			configure: (builder) => builder.equalTo(),
			expected: 'eq',
		},
		{
			name: 'notEqualTo',
			configure: (builder) => builder.notEqualTo(),
			expected: 'ne',
		},
	];

	cases.forEach(({ name, configure, expected }) => {
		it(`${name} sets operator token`, () => {
			expect(readOperator(configure)).toBe(expected);
		});
	});
});
