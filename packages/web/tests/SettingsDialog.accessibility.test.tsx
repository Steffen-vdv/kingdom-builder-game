/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import SettingsDialog from '../src/components/settings/SettingsDialog';

type SettingsDialogProps = React.ComponentProps<typeof SettingsDialog>;

function createProps(
	overrides: Partial<SettingsDialogProps> = {},
): SettingsDialogProps {
	return {
		open: true,
		onClose: vi.fn(),
		darkMode: false,
		onToggleDark: vi.fn(),
		musicEnabled: true,
		onToggleMusic: vi.fn(),
		soundEnabled: true,
		onToggleSound: vi.fn(),
		backgroundAudioMuted: false,
		onToggleBackgroundAudioMute: vi.fn(),
		playerName: 'Traveler',
		onChangePlayerName: vi.fn(),
		...overrides,
	};
}

describe('SettingsDialog accessibility', () => {
	it('focuses the general tab and restores the trigger focus', async () => {
		const trigger = document.createElement('button');
		trigger.textContent = 'Open settings';
		document.body.append(trigger);
		trigger.focus();
		const onClose = vi.fn();
		const props = createProps({ onClose });
		const { rerender, unmount } = render(<SettingsDialog {...props} />);
		const generalTab = await screen.findByRole('button', {
			name: 'General',
		});
		await waitFor(() => {
			expect(generalTab).toHaveFocus();
		});
		fireEvent.keyDown(document, { key: 'Escape' });
		expect(onClose).toHaveBeenCalledTimes(1);
		rerender(<SettingsDialog {...props} open={false} />);
		await waitFor(() => {
			expect(trigger).toHaveFocus();
		});
		trigger.remove();
		unmount();
	});

	it('traps focus within the dialog surface while tabbing', async () => {
		const trigger = document.createElement('button');
		trigger.textContent = 'Launcher';
		document.body.append(trigger);
		trigger.focus();
		const onClose = vi.fn();
		const props = createProps({ onClose });
		const { rerender, unmount } = render(<SettingsDialog {...props} />);
		const generalTab = await screen.findByRole('button', {
			name: 'General',
		});
		await waitFor(() => {
			expect(generalTab).toHaveFocus();
		});
		const closeButton = screen.getByRole('button', { name: 'Close' });
		fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
		await waitFor(() => {
			expect(closeButton).toHaveFocus();
		});
		fireEvent.keyDown(document, { key: 'Tab' });
		await waitFor(() => {
			expect(generalTab).toHaveFocus();
		});
		closeButton.focus();
		fireEvent.keyDown(document, { key: 'Tab' });
		expect(generalTab).toHaveFocus();
		fireEvent.keyDown(document, { key: 'Escape' });
		expect(onClose).toHaveBeenCalledTimes(1);
		rerender(<SettingsDialog {...props} open={false} />);
		await waitFor(() => {
			expect(trigger).toHaveFocus();
		});
		trigger.remove();
		unmount();
	});
});
