import ControlBindingRow from './ControlBindingRow';
import {
	CONTROL_DEFINITIONS,
	normalizeKeyInput,
	type ControlId,
	type ControlKeybindMap,
} from '../../state/keybindings';

const LIST_CLASS = ['flex flex-col gap-4'].join(' ');

interface ControlBindingsTabProps {
	keybinds: ControlKeybindMap;
	onChange: (controlId: ControlId, value: string) => void;
	onReset: (controlId: ControlId) => void;
}

export default function ControlBindingsTab({
	keybinds,
	onChange,
	onReset,
}: ControlBindingsTabProps) {
	return (
		<div className={LIST_CLASS}>
			{CONTROL_DEFINITIONS.map((control) => {
				const defaultValue = normalizeKeyInput(control.defaultKey);
				const value = keybinds[control.id];
				return (
					<ControlBindingRow
						key={control.id}
						control={control}
						value={value}
						defaultValue={defaultValue}
						onChange={(next) => onChange(control.id, next)}
						onReset={() => onReset(control.id)}
					/>
				);
			})}
		</div>
	);
}
