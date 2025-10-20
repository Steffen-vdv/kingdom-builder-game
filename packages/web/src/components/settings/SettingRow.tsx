import ToggleSwitch from '../common/ToggleSwitch';

const SETTING_ROW_CLASS = [
	'flex items-center justify-between gap-4 rounded-2xl border',
	'border-white/20 bg-white/85 px-6 py-5',
	'shadow-inner shadow-slate-900/5 dark:border-white/10',
	'dark:bg-slate-900/80 dark:shadow-black/30',
].join(' ');

const SETTING_TITLE_CLASS = [
	'text-sm font-semibold uppercase tracking-wide text-slate-700',
	'dark:text-slate-200',
].join(' ');

const SETTING_DESCRIPTION_CLASS = [
	'mt-2 text-sm text-slate-600',
	'dark:text-slate-300/80',
].join(' ');

export interface SettingRowProps {
	id: string;
	title: string;
	description: string;
	checked: boolean;
	onToggle: () => void;
}

export default function SettingRow({
	id,
	title,
	description,
	checked,
	onToggle,
}: SettingRowProps) {
	return (
		<div className={SETTING_ROW_CLASS}>
			<div className="max-w-[75%] text-left">
				<h3 id={`${id}-label`} className={SETTING_TITLE_CLASS}>
					{title}
				</h3>
				<p className={SETTING_DESCRIPTION_CLASS}>{description}</p>
			</div>
			<ToggleSwitch
				checked={checked}
				onChange={() => onToggle()}
				aria-labelledby={`${id}-label`}
			/>
		</div>
	);
}
