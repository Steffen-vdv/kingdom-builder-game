import { useMemo, useState } from 'react';
import type {
	ActionConfig,
	SessionRegistriesPayload,
} from '@boardsmith/protocol';

const TABLE_CLASS = ['w-full text-left text-sm'].join(' ');

const TH_CLASS = [
	'px-3 py-2 text-xs font-semibold uppercase tracking-wider',
	'text-slate-500 dark:text-slate-400',
	'border-b border-slate-200 dark:border-white/10',
].join(' ');

const TD_CLASS = [
	'px-3 py-2 border-b border-slate-100 dark:border-white/5',
].join(' ');

const BADGE_CLASS = [
	'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
].join(' ');

const FILTER_BUTTON_CLASS = [
	'rounded-full px-3 py-1 text-xs font-medium transition',
	'cursor-pointer',
].join(' ');

function tierCount(action: ActionConfig): number {
	return Object.keys(action.tiers).length;
}

function effectCount(action: ActionConfig): number {
	let count = 0;
	for (const tier of Object.values(action.tiers)) {
		count += tier.effects.length;
	}
	return count;
}

interface ActionsTabProps {
	registries: SessionRegistriesPayload;
}

export function ActionsTab({ registries }: ActionsTabProps) {
	const [filter, setFilter] = useState<'all' | 'player' | 'system' | 'locked'>(
		'all',
	);
	const [search, setSearch] = useState('');

	const actions = useMemo(() => {
		const list = Object.values(registries.actions);
		return list.sort((first, second) => first.name.localeCompare(second.name));
	}, [registries.actions]);

	const metaCategories = useMemo(
		() => registries.actionMetaCategories ?? {},
		[registries.actionMetaCategories],
	);

	const filtered = useMemo(() => {
		let result = actions;
		if (filter === 'player') {
			result = result.filter((a) => !a.system);
		} else if (filter === 'system') {
			result = result.filter((a) => a.system);
		} else if (filter === 'locked') {
			result = result.filter((a) => a.locked);
		}
		if (search.trim().length > 0) {
			const query = search.toLowerCase();
			result = result.filter(
				(a) =>
					a.name.toLowerCase().includes(query) ||
					a.id.toLowerCase().includes(query),
			);
		}
		return result;
	}, [actions, filter, search]);

	const filters: Array<{
		id: typeof filter;
		label: string;
		count: number;
	}> = [
		{ id: 'all', label: 'All', count: actions.length },
		{
			id: 'player',
			label: 'Player',
			count: actions.filter((a) => !a.system).length,
		},
		{
			id: 'system',
			label: 'System',
			count: actions.filter((a) => a.system).length,
		},
		{
			id: 'locked',
			label: 'Locked',
			count: actions.filter((a) => a.locked).length,
		},
	];

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center gap-3">
				<h2 className="text-lg font-semibold">Actions Catalog</h2>
				<span className="text-xs text-slate-500 dark:text-slate-400">
					{filtered.length} of {actions.length}
				</span>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				{filters.map((f) => (
					<button
						key={f.id}
						type="button"
						className={`${FILTER_BUTTON_CLASS} ${
							filter === f.id
								? 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200'
								: 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
						}`}
						onClick={() => setFilter(f.id)}
					>
						{f.label} ({f.count})
					</button>
				))}
				<input
					type="text"
					placeholder="Search actions..."
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
							<th className={TH_CLASS}>Meta-Category</th>
							<th className={TH_CLASS}>Tiers</th>
							<th className={TH_CLASS}>Effects</th>
							<th className={TH_CLASS}>Flags</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((action) => {
							const metaCat = metaCategories[action.metaCategory];
							return (
								<tr
									key={action.id}
									className="transition hover:bg-slate-50 dark:hover:bg-white/5"
								>
									<td className={TD_CLASS}>
										<span className="text-lg">{action.icon ?? ''}</span>
									</td>
									<td className={`${TD_CLASS} font-medium`}>{action.name}</td>
									<td
										className={`${TD_CLASS} font-mono text-xs text-slate-500 dark:text-slate-400`}
									>
										{action.id}
									</td>
									<td className={TD_CLASS}>
										{metaCat ? (
											<span>
												{metaCat.icon} {metaCat.label}
											</span>
										) : (
											<span className="text-slate-400">
												{action.metaCategory}
											</span>
										)}
									</td>
									<td className={`${TD_CLASS} tabular-nums`}>
										{tierCount(action)}
									</td>
									<td className={`${TD_CLASS} tabular-nums`}>
										{effectCount(action)}
									</td>
									<td className={TD_CLASS}>
										<div className="flex flex-wrap gap-1">
											{action.system && (
												<span
													className={`${BADGE_CLASS} bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300`}
												>
													system
												</span>
											)}
											{action.locked && (
												<span
													className={`${BADGE_CLASS} bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300`}
												>
													locked
												</span>
											)}
											{action.oneTime && (
												<span
													className={`${BADGE_CLASS} bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300`}
												>
													one-time
												</span>
											)}
											{action.free && (
												<span
													className={`${BADGE_CLASS} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300`}
												>
													free
												</span>
											)}
											{action.maxUsesPerTurn !== undefined && (
												<span
													className={`${BADGE_CLASS} bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300`}
												>
													max {action.maxUsesPerTurn}/turn
												</span>
											)}
										</div>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{filtered.length === 0 && (
				<p className="py-8 text-center text-sm text-slate-400">
					No actions match the current filter.
				</p>
			)}
		</div>
	);
}
