import { useEffect, useMemo, useRef, useState } from 'react';
import {
	describeKeybind,
	normalizeKeyInput,
	type ControlDefinition,
} from '../../state/keybindings';
import { useSoundEffectsContext } from '../../state/SoundEffectsContext';

const ROW_CLASS = [
	'flex items-center justify-between gap-4 rounded-2xl border',
	'border-white/20 bg-white/85 px-6 py-5 shadow-inner shadow-slate-900/5',
	'dark:border-white/10 dark:bg-slate-900/80 dark:shadow-black/30',
].join(' ');

const TITLE_CLASS = [
	'text-sm font-semibold uppercase tracking-wide text-slate-700',
	'dark:text-slate-200',
].join(' ');

const DESCRIPTION_CLASS = [
	'mt-2 text-xs uppercase tracking-[0.3em] text-slate-500',
	'dark:text-slate-300/80',
].join(' ');

const KEY_BUTTON_CLASS = [
	'min-w-[8rem] rounded-xl border px-4 py-2 text-sm font-semibold',
	'transition focus:outline-none focus-visible:ring-2',
	'focus-visible:ring-emerald-300 dark:focus-visible:ring-emerald-500/60',
].join(' ');

const KEY_BUTTON_IDLE_CLASS = [
	'border-white/40 bg-white/80 text-slate-700 hover:bg-white/90',
	'dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100',
	'dark:hover:bg-slate-900/60',
].join(' ');

const KEY_BUTTON_ACTIVE_CLASS = [
	'border-emerald-400/80 bg-emerald-50 text-emerald-900 shadow-inner',
	'dark:border-emerald-400/60 dark:bg-emerald-500/20 dark:text-emerald-100',
].join(' ');

const RESET_BUTTON_CLASS = [
	'rounded-xl border border-transparent px-3 py-1 text-xs font-semibold',
	'text-slate-600 hover:text-emerald-600 focus:outline-none',
	'focus-visible:ring-2 focus-visible:ring-emerald-300 dark:text-slate-300',
	'dark:hover:text-emerald-200 dark:focus-visible:ring-emerald-500/60',
	'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

interface ControlBindingRowProps {
	control: ControlDefinition;
	value: string;
	defaultValue: string;
	onChange: (value: string) => void;
	onReset: () => void;
}

export default function ControlBindingRow({
	control,
	value,
	defaultValue,
	onChange,
	onReset,
}: ControlBindingRowProps) {
	const [isListening, setIsListening] = useState(false);
	const { playUiClick } = useSoundEffectsContext();
	const buttonRef = useRef<HTMLButtonElement | null>(null);
	const keyLabel = useMemo(() => describeKeybind(value), [value]);
	const defaultLabel = useMemo(
		() => describeKeybind(defaultValue),
		[defaultValue],
	);

	useEffect(() => {
		if (!isListening) {
			return;
		}
		const finishListening = () => {
			setIsListening(false);
			window.setTimeout(() => {
				buttonRef.current?.focus();
			}, 0);
		};
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.defaultPrevented) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			event.stopImmediatePropagation();
			if (event.key === 'Escape') {
				finishListening();
				return;
			}
			const normalized = normalizeKeyInput(event.key);
			if (!normalized) {
				return;
			}
			onChange(normalized);
			finishListening();
		};
		const handlePointer = (event: Event) => {
			const target = event.target;
			if (
				target instanceof Node &&
				buttonRef.current &&
				buttonRef.current.contains(target)
			) {
				return;
			}
			finishListening();
		};
		window.addEventListener('keydown', handleKeyDown, true);
		window.addEventListener('mousedown', handlePointer);
		window.addEventListener('focusin', handlePointer);
		return () => {
			window.removeEventListener('keydown', handleKeyDown, true);
			window.removeEventListener('mousedown', handlePointer);
			window.removeEventListener('focusin', handlePointer);
		};
	}, [isListening, onChange]);

	const handleClick = () => {
		playUiClick();
		setIsListening(true);
	};

	const handleReset = () => {
		playUiClick();
		onReset();
	};

	return (
		<div className={ROW_CLASS}>
			<div className="max-w-[75%] text-left">
				<h3 className={TITLE_CLASS}>{control.label}</h3>
				<p className={DESCRIPTION_CLASS}>Default: {defaultLabel}</p>
			</div>
			<div className="flex items-center gap-3">
				<button
					ref={buttonRef}
					type="button"
					className={`${KEY_BUTTON_CLASS} ${
						isListening ? KEY_BUTTON_ACTIVE_CLASS : KEY_BUTTON_IDLE_CLASS
					}`}
					onClick={handleClick}
					aria-pressed={isListening}
				>
					{isListening ? 'Press any key (Esc to cancel)' : keyLabel}
				</button>
				<button
					type="button"
					className={RESET_BUTTON_CLASS}
					onClick={handleReset}
					disabled={value === defaultValue}
				>
					Reset
				</button>
			</div>
		</div>
	);
}
