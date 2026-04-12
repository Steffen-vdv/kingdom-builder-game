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

const BADGE_CLASS = [
	'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
].join(' ');

function formatBound(
	bound: number | { resourceId: string } | undefined | null,
): string {
	if (bound === undefined || bound === null) {
		return '—';
	}
	if (typeof bound === 'object') {
		const shortId = bound.resourceId.split(':').pop() ?? bound.resourceId;
		return `ref:${shortId}`;
	}
	return String(bound);
}

interface ResourcesTabProps {
	registries: SessionRegistriesPayload;
}

export function ResourcesTab({ registries }: ResourcesTabProps) {
	const [search, setSearch] = useState('');
	const [groupFilter, setGroupFilter] = useState<string | null>(null);

	const resources = useMemo(
		() =>
			Object.values(registries.resources).sort((a, b) =>
				a.id.localeCompare(b.id),
			),
		[registries.resources],
	);

	const groups = useMemo(() => {
		const groupMap = registries.resourceGroups ?? {};
		return Object.values(groupMap).sort((a, b) => a.id.localeCompare(b.id));
	}, [registries.resourceGroups]);

	const filtered = useMemo(() => {
		let result = resources;
		if (groupFilter) {
			result = result.filter((r) => r.groupId === groupFilter);
		}
		if (search.trim().length > 0) {
			const query = search.toLowerCase();
			result = result.filter(
				(r) =>
					r.id.toLowerCase().includes(query) ||
					(r.label ?? '').toLowerCase().includes(query),
			);
		}
		return result;
	}, [resources, groupFilter, search]);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center gap-3">
				<h2 className="text-lg font-semibold">Resources Catalog</h2>
				<span className="text-xs text-slate-500 dark:text-slate-400">
					{filtered.length} of {resources.length}
				</span>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<button
					type="button"
					className={`rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer ${
						groupFilter === null
							? 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200'
							: 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
					}`}
					onClick={() => setGroupFilter(null)}
				>
					All ({resources.length})
				</button>
				{groups.map((group) => {
					const count = resources.filter((r) => r.groupId === group.id).length;
					if (count === 0) {
						return null;
					}
					return (
						<button
							key={group.id}
							type="button"
							className={`rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer ${
								groupFilter === group.id
									? 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200'
									: 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
							}`}
							onClick={() => setGroupFilter(group.id)}
						>
							{group.icon ?? ''} {group.label ?? group.id} ({count})
						</button>
					);
				})}
				<input
					type="text"
					placeholder="Search resources..."
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
							<th className={TH_CLASS}>Label</th>
							<th className={TH_CLASS}>ID</th>
							<th className={TH_CLASS}>Group</th>
							<th className={TH_CLASS}>Lower</th>
							<th className={TH_CLASS}>Upper</th>
							<th className={TH_CLASS}>Flags</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((resource) => {
							const group =
								resource.groupId && registries.resourceGroups
									? registries.resourceGroups[resource.groupId]
									: undefined;
							return (
								<tr
									key={resource.id}
									className="transition hover:bg-slate-50 dark:hover:bg-white/5"
								>
									<td className={TD_CLASS}>
										<span className="text-lg">{resource.icon ?? ''}</span>
									</td>
									<td className={`${TD_CLASS} font-medium`}>
										{resource.label ?? resource.id}
									</td>
									<td
										className={`${TD_CLASS} font-mono text-xs text-slate-500 dark:text-slate-400`}
									>
										{resource.id}
									</td>
									<td className={`${TD_CLASS} text-xs`}>
										{group ? (
											<span>
												{group.icon ?? ''} {group.label ?? group.id}
											</span>
										) : (
											'—'
										)}
									</td>
									<td className={`${TD_CLASS} tabular-nums`}>
										{formatBound(resource.lowerBound)}
									</td>
									<td className={`${TD_CLASS} tabular-nums`}>
										{formatBound(resource.upperBound)}
									</td>
									<td className={TD_CLASS}>
										<div className="flex flex-wrap gap-1">
											{resource.displayAsPercent && (
												<span
													className={`${BADGE_CLASS} bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300`}
												>
													%
												</span>
											)}
											{resource.tierTrack && (
												<span
													className={`${BADGE_CLASS} bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300`}
												>
													tiered
												</span>
											)}
											{resource.globalCost && (
												<span
													className={`${BADGE_CLASS} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300`}
												>
													global cost
												</span>
											)}
											{resource.boundOf && (
												<span
													className={`${BADGE_CLASS} bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300`}
												>
													{resource.boundOf.boundType} bound
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
					No resources match the current filter.
				</p>
			)}
		</div>
	);
}
