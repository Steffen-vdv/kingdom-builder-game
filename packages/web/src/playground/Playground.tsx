import { useState } from 'react';
import Button from '../components/common/Button';
import { usePlaygroundData } from './usePlaygroundData';
import { ActionsTab } from './tabs/ActionsTab';
import { BuildingsTab } from './tabs/BuildingsTab';
import { ResourcesTab } from './tabs/ResourcesTab';

type TabId = 'actions' | 'buildings' | 'resources';

const TABS: Array<{ id: TabId; label: string; icon: string }> = [
	{ id: 'actions', label: 'Actions', icon: '⚔️' },
	{ id: 'buildings', label: 'Buildings', icon: '🏛️' },
	{ id: 'resources', label: 'Resources', icon: '💰' },
];

const SURFACE_CLASS = [
	'relative min-h-screen w-full overflow-hidden',
	'bg-gradient-to-br from-purple-50 via-fuchsia-50 to-indigo-50',
	'text-slate-900',
	'dark:from-slate-950 dark:via-slate-900 dark:to-slate-950',
	'dark:text-slate-100',
].join(' ');

const HEADER_CLASS = [
	'flex flex-wrap items-center justify-between gap-4',
	'rounded-3xl border border-white/50',
	'bg-white/70 px-6 py-4 shadow-xl',
	'dark:border-white/10 dark:bg-slate-900/70',
	'dark:shadow-slate-900/40 frosted-surface',
].join(' ');

const TAB_BAR_CLASS = [
	'flex rounded-full bg-slate-100/60 p-1',
	'dark:bg-slate-800/50',
].join(' ');

const TAB_BUTTON_BASE = [
	'flex items-center gap-2 rounded-full px-4 py-2',
	'text-sm font-semibold transition cursor-pointer',
	'focus:outline-none focus-visible:ring-2',
	'focus-visible:ring-purple-300',
	'dark:focus-visible:ring-purple-500/60',
].join(' ');

const TAB_ACTIVE_CLASS = [
	'border border-purple-300 bg-purple-100 text-purple-900',
	'shadow-sm shadow-purple-500/20',
	'dark:border-purple-500/40 dark:bg-purple-500/20',
	'dark:text-purple-100',
].join(' ');

const TAB_INACTIVE_CLASS = [
	'border border-transparent text-slate-600',
	'hover:bg-white/80 hover:text-purple-700',
	'dark:text-slate-200',
	'dark:hover:bg-white/10 dark:hover:text-purple-200',
].join(' ');

const CONTENT_CLASS = [
	'rounded-3xl border border-white/50',
	'bg-white/70 p-6 shadow-xl',
	'dark:border-white/10 dark:bg-slate-900/70',
	'dark:shadow-slate-900/40 frosted-surface',
].join(' ');

interface PlaygroundProps {
	onBack: () => void;
}

export default function Playground({ onBack }: PlaygroundProps) {
	const [activeTab, setActiveTab] = useState<TabId>('actions');
	const { data, loading, error } = usePlaygroundData();

	return (
		<div className={SURFACE_CLASS}>
			<div className="relative z-10 flex min-h-screen flex-col gap-6 px-4 py-8 sm:px-8 lg:px-12">
				<div className={HEADER_CLASS}>
					<div className="flex items-center gap-4">
						<Button variant="ghost" icon="←" onClick={onBack}>
							Menu
						</Button>
						<div>
							<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
								Playground
							</h1>
							<p className="text-xs text-slate-500 dark:text-slate-400">
								Content explorer for product owners
							</p>
						</div>
					</div>
					<div className={TAB_BAR_CLASS}>
						{TABS.map((tab) => (
							<button
								key={tab.id}
								type="button"
								className={`${TAB_BUTTON_BASE} ${
									activeTab === tab.id ? TAB_ACTIVE_CLASS : TAB_INACTIVE_CLASS
								}`}
								onClick={() => setActiveTab(tab.id)}
							>
								<span aria-hidden>{tab.icon}</span>
								<span>{tab.label}</span>
							</button>
						))}
					</div>
				</div>

				<div className={CONTENT_CLASS}>
					{loading && (
						<p className="py-12 text-center text-slate-500">
							Loading content data...
						</p>
					)}
					{error && <p className="py-12 text-center text-rose-500">{error}</p>}
					{data && activeTab === 'actions' && (
						<ActionsTab registries={data.registries} />
					)}
					{data && activeTab === 'buildings' && (
						<BuildingsTab registries={data.registries} />
					)}
					{data && activeTab === 'resources' && (
						<ResourcesTab registries={data.registries} />
					)}
				</div>
			</div>
		</div>
	);
}
