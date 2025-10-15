import type { ReactElement } from 'react';

import OptionCard, { type ActionCardOption } from './OptionCard';

export interface OptionListProps {
	options: ActionCardOption[];
}

export default function OptionList({ options }: OptionListProps): ReactElement {
	if (options.length === 0) {
		return (
			<div className="text-sm text-slate-600 dark:text-slate-300">
				No options available.
			</div>
		);
	}
	return (
		<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
			{options.map((option) => (
				<OptionCard key={option.id} option={option} />
			))}
		</div>
	);
}
