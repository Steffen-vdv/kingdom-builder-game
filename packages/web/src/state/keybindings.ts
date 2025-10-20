import { useCallback, useMemo, useState } from 'react';
import type { TimeScale } from './useTimeScale';

type AdvanceControlDefinition = {
	readonly id: 'advance';
	readonly label: string;
	readonly defaultKey: string;
};

type SpeedControlDefinition = {
	readonly id: 'speed-1' | 'speed-2' | 'speed-3' | 'speed-4';
	readonly label: string;
	readonly defaultKey: string;
	readonly timeScale: TimeScale;
};

const ADVANCE_CONTROL_ID = 'advance' as const;

type ControlDefinition = AdvanceControlDefinition | SpeedControlDefinition;

const CONTROL_DEFINITIONS: readonly ControlDefinition[] = [
	{
		id: ADVANCE_CONTROL_ID,
		label: 'Advance Action/Turn',
		defaultKey: ' ',
	},
	{
		id: 'speed-1',
		label: 'Speed x1',
		defaultKey: '1',
		timeScale: 1,
	},
	{
		id: 'speed-2',
		label: 'Speed x2',
		defaultKey: '2',
		timeScale: 2,
	},
	{
		id: 'speed-3',
		label: 'Speed x5',
		defaultKey: '3',
		timeScale: 5,
	},
	{
		id: 'speed-4',
		label: 'Speed x100',
		defaultKey: '4',
		timeScale: 100,
	},
];

const SPEED_CONTROL_DEFINITIONS: readonly SpeedControlDefinition[] =
	CONTROL_DEFINITIONS.filter(
		(control): control is SpeedControlDefinition => 'timeScale' in control,
	);

const KEYBIND_STORAGE_KEY = 'kingdom-builder.controls.keybinds';

type ControlId = ControlDefinition['id'];

type ControlKeybindMap = Record<ControlId, string>;

const KEY_LABEL_OVERRIDES: Record<string, string> = {
	' ': 'Space',
	Escape: 'Esc',
	ArrowUp: 'Arrow Up',
	ArrowDown: 'Arrow Down',
	ArrowLeft: 'Arrow Left',
	ArrowRight: 'Arrow Right',
};

function buildDefaultKeybinds(): ControlKeybindMap {
	return CONTROL_DEFINITIONS.reduce<ControlKeybindMap>((map, control) => {
		const key = normalizeKeyInput(control.defaultKey);
		return {
			...map,
			[control.id]: key,
		};
	}, {} as ControlKeybindMap);
}

function readStoredKeybinds(): Partial<ControlKeybindMap> {
	if (typeof window === 'undefined') {
		return {};
	}
	try {
		const raw = window.localStorage.getItem(KEYBIND_STORAGE_KEY);
		if (!raw) {
			return {};
		}
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== 'object') {
			return {};
		}
		const result: Partial<ControlKeybindMap> = {};
		for (const control of CONTROL_DEFINITIONS) {
			const storedValue = (parsed as Record<string, unknown>)[control.id];
			if (typeof storedValue !== 'string') {
				continue;
			}
			const normalized = normalizeKeyInput(storedValue);
			if (!normalized) {
				continue;
			}
			result[control.id] = normalized;
		}
		return result;
	} catch (error) {
		void error;
		return {};
	}
}

function writeStoredKeybinds(map: ControlKeybindMap) {
	if (typeof window === 'undefined') {
		return;
	}
	try {
		window.localStorage.setItem(KEYBIND_STORAGE_KEY, JSON.stringify(map));
	} catch (error) {
		void error;
	}
}

function formatCompositeLabel(key: string): string {
	return key.replace(/([a-z])([A-Z])/g, '$1 $2');
}

export function normalizeKeyInput(value: string): string {
	if (!value) {
		return '';
	}
	if (value === 'Spacebar' || value === 'Space') {
		return ' ';
	}
	if (value === ' ') {
		return ' ';
	}
	if (value.length === 1) {
		return value.toLowerCase();
	}
	return value;
}

export function describeKeybind(key: string): string {
	if (!key) {
		return 'Unbound';
	}
	const override = KEY_LABEL_OVERRIDES[key];
	if (override) {
		return override;
	}
	if (key.length === 1) {
		return key.toUpperCase();
	}
	return formatCompositeLabel(key);
}

export function useKeybindingPreferences(): {
	keybinds: ControlKeybindMap;
	setControlKeybind: (controlId: ControlId, value: string) => void;
	resetControlKeybind: (controlId: ControlId) => void;
} {
	const defaults = useMemo(() => buildDefaultKeybinds(), []);
	const [keybinds, setKeybinds] = useState<ControlKeybindMap>(() => {
		const stored = readStoredKeybinds();
		return { ...defaults, ...stored };
	});

	const persist = useCallback((map: ControlKeybindMap) => {
		writeStoredKeybinds(map);
	}, []);

	const setControlKeybind = useCallback(
		(controlId: ControlId, value: string) => {
			const normalized = normalizeKeyInput(value);
			if (!normalized) {
				return;
			}
			setKeybinds((previous) => {
				if (previous[controlId] === normalized) {
					return previous;
				}
				const next = { ...previous, [controlId]: normalized };
				persist(next);
				return next;
			});
		},
		[persist],
	);

	const resetControlKeybind = useCallback(
		(controlId: ControlId) => {
			const defaultValue = defaults[controlId];
			setKeybinds((previous) => {
				if (previous[controlId] === defaultValue) {
					return previous;
				}
				const next = { ...previous, [controlId]: defaultValue };
				persist(next);
				return next;
			});
		},
		[defaults, persist],
	);

	return useMemo(
		() => ({
			keybinds,
			setControlKeybind,
			resetControlKeybind,
		}),
		[keybinds, setControlKeybind, resetControlKeybind],
	);
}

export type {
	ControlDefinition,
	ControlId,
	ControlKeybindMap,
	SpeedControlDefinition,
};

export { ADVANCE_CONTROL_ID, CONTROL_DEFINITIONS, SPEED_CONTROL_DEFINITIONS };
