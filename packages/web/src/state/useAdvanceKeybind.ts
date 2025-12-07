import { useEffect } from 'react';
import { useGameEngine } from './GameContext';
import { ADVANCE_CONTROL_ID, normalizeKeyInput } from './keybindings';
import { useAdvanceAction } from './useAdvanceAction';

const INTERACTIVE_ELEMENT_SELECTOR = 'button, input, textarea, select';
const ROLE_ELEMENT_SELECTOR = '[role="button"], [role="textbox"]';
const CONTENT_EDITABLE_SELECTOR = '[contenteditable="true"]';

function isInteractiveTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) {
		return false;
	}
	const tagName = target.tagName;
	if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
		return true;
	}
	if (target.isContentEditable) {
		return true;
	}
	if (tagName === 'BUTTON') {
		return true;
	}
	if (target.closest(INTERACTIVE_ELEMENT_SELECTOR)) {
		return true;
	}
	if (target.closest(CONTENT_EDITABLE_SELECTOR)) {
		return true;
	}
	if (target.closest(ROLE_ELEMENT_SELECTOR)) {
		return true;
	}
	return false;
}

interface UseAdvanceKeybindOptions {
	disabled?: boolean;
}

/**
 * Hook that handles the "advance" keybind. Uses useAdvanceAction as the
 * single source of truth for determining what action to take.
 */
export function useAdvanceKeybind(options: UseAdvanceKeybindOptions = {}) {
	const { disabled = false } = options;
	const { controlKeybinds } = useGameEngine();
	const { canAdvance, advance } = useAdvanceAction();

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}
		if (disabled) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.defaultPrevented || event.repeat) {
				return;
			}
			if (event.metaKey || event.ctrlKey || event.altKey) {
				return;
			}
			if (isInteractiveTarget(event.target)) {
				return;
			}
			if (typeof document !== 'undefined') {
				const activeElement = document.activeElement;
				if (isInteractiveTarget(activeElement)) {
					return;
				}
			}
			const key = normalizeKeyInput(event.key);
			if (!key) {
				return;
			}
			if (key !== controlKeybinds[ADVANCE_CONTROL_ID]) {
				return;
			}

			if (canAdvance) {
				event.preventDefault();
				advance();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [advance, canAdvance, controlKeybinds, disabled]);
}
