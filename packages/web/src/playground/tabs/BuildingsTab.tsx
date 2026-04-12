import { useMemo, useState } from 'react';
import type { SessionRegistriesPayload } from '@boardsmith/protocol';

const TABLE_CLASS = 'w-full text-left text-sm';

const TH_CLASS = [
	'px-3 py-2 text-xs font-semibold uppercase tracking-wider',
	'text-slate-500 dark:text-slate-400',
	'border-b border-slate-200 dark:border-white/10',
].join(' ');

const TD_CLASS = [
	'px-3 py-2 border-b border-slate-100 dark:border-white/5',
].join(' ');

function formatCosts(costs: Record<string, number> | undefined): string {
	if (!costs) {
		return '—';
	}
	const entries = Object.entries(costs);
	if (entries.length === 0) {
		return '—';
	}
	return entries
		.map(([key, value]) => {
			const shortKey = key.split(':').pop() ?? key;
			return `${value} ${shortKey}`;
		})
		.join(', ');
}

function triggerCount(building: Record<string, unknown>): number {
	const triggers = [
		'onBuild',
		'onBeforeAttacked',
		'onAttackResolved',
		'onPayUpkeepStep',
		'onGainIncomeStep',
		'onGainAPStep',
	];
	let count = 0;
	for (const trigger of triggers) {
		const value = building[trigger];
		if (Array.isArray(value)) {
			count += value.length;
		}
	}
	return count;
}

interface BuildingsTabProps {
	registries: SessionRegistriesPayload;
}

export function BuildingsTab({ registries }: BuildingsTabProps) {
	const [search, setSearch] = useState('');
	const [showType, setShowType] = useState<'buildings' | 'developments'>(
		'buildings',
	);

	const buildings = useMemo(
		() =>
			Object.values(registries.buildings).sort((a, b) =>
				a.name.localeCompare(b.name),
			),
		[registries.buildings],
	);

	const developments = useMemo(
		() =>
			Object.values(registries.developments).sort((a, b) =>
				a.name.localeCompare(b.name),
			),
		[registries.developments],
	);

	const items = showType === 'buildings' ? buildings : developments;

	const filtered = useMemo(() => {
		if (search.trim().length === 0) {
			return items;
		}
		const query = search.toLowerCase();
		return items.filter(
			(item) =>
				item.name.toLowerCase().includes(query) ||
				item.id.toLowerCase().includes(query),
		);
	}, [items, search]);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center gap-3">
				<h2 className="text-lg font-semibold">
					{showType === 'buildings' ? 'Buildings' : 'Developments'} Catalog
				</h2>
				<span className="text-xs text-slate-500 dark:text-slate-400">
					{filtered.length} of {items.length}
				</span>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<button
					type="button"
					className={`rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer ${
						showType === 'buildings'
							? 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200'
							: 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
					}`}
					onClick={() => setShowType('buildings')}
				>
					Buildings ({buildings.length})
				</button>
				<button
					type="button"
					className={`rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer ${
						showType === 'developments'
							? 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200'
							: 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
					}`}
					onClick={() => setShowType('developments')}
				>
					Developments ({developments.length})
				</button>
				<input
					type="text"
					placeholder="Search..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="ml-auto rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs outline-none focus:border-purple-300 dark:border-white/10 dark:bg-slate-800/50 dark:focus:border-purple-500/40"
				/>
			</div>

			<div className="overflow-x-auto">
				<table className={TABLE_CLASS}>
					<thead>
						<tr>
							<th className={TH_CLASS}>Icon</th>
							<th className={TH_CLASS}>Name</th>
							<th className={TH_CLASS}>ID</th>
							<th className={TH_CLASS}>Costs</th>
							<th className={TH_CLASS}>Upkeep</th>
							<th className={TH_CLASS}>Triggers</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((item) => (
							<tr
								key={item.id}
								className="transition hover:bg-slate-50 dark:hover:bg-white/5"
							>
								<td className={TD_CLASS}>
									<span className="text-lg">{item.icon ?? ''}</span>
								</td>
								<td className={`${TD_CLASS} font-medium`}>{item.name}</td>
								<td
									className={`${TD_CLASS} font-mono text-xs text-slate-500 dark:text-slate-400`}
								>
									{item.id}
								</td>
								<td className={`${TD_CLASS} text-xs`}>
									{'costs' in item ? formatCosts(item.costs) : '—'}
								</td>
								<td className={`${TD_CLASS} text-xs`}>
									{formatCosts(item.upkeep)}
								</td>
								<td className={`${TD_CLASS} tabular-nums`}>
									{triggerCount(item as unknown as Record<string, unknown>)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{filtered.length === 0 && (
				<p className="py-8 text-center text-sm text-slate-400">
					No items match the current search.
				</p>
			)}
		</div>
	);
}
