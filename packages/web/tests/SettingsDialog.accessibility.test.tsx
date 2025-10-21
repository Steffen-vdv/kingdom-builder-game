/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
		autoAcknowledgeEnabled: false,
		onToggleAutoAcknowledge: vi.fn(),
		autoPassEnabled: false,
		onToggleAutoPass: vi.fn(),
		playerName: 'Traveler',
		onChangePlayerName: vi.fn(),
		...overrides,
	};
}

describe('SettingsDialog accessibility', () => {
	it('focuses the game tab and restores the trigger focus', async () => {
		const trigger = document.createElement('button');
		trigger.textContent = 'Open settings';
		document.body.append(trigger);
		trigger.focus();
		const onClose = vi.fn();
		const props = createProps({ onClose });
		const { rerender, unmount } = render(<SettingsDialog {...props} />);
		const gameTab = await screen.findByRole('button', {
			name: 'Game',
		});
		await waitFor(() => {
			expect(gameTab).toHaveFocus();
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
		const user = userEvent.setup();
		const trigger = document.createElement('button');
		trigger.textContent = 'Launcher';
		document.body.append(trigger);
		trigger.focus();
		const onClose = vi.fn();
		const props = createProps({ onClose });
		const { rerender, unmount } = render(<SettingsDialog {...props} />);
		const gameTab = await screen.findByRole('button', {
			name: 'Game',
		});
		const audioTab = screen.getByRole('button', { name: 'Audio' });
		const visualTab = screen.getByRole('button', { name: 'Visual' });
		await waitFor(() => {
			expect(gameTab).toHaveFocus();
		});
		const closeButton = screen.getByRole('button', { name: 'Close' });
		await user.tab({ shift: true });
		await waitFor(() => {
			expect(closeButton).toHaveFocus();
		});
		await user.tab();
		await waitFor(() => {
			expect(gameTab).toHaveFocus();
		});
		await user.tab();
		await waitFor(() => {
			expect(visualTab).toHaveFocus();
		});
		await user.tab();
		await waitFor(() => {
			expect(audioTab).toHaveFocus();
		});
		await user.keyboard('{Escape}');
		expect(onClose).toHaveBeenCalledTimes(1);
		rerender(<SettingsDialog {...props} open={false} />);
		await waitFor(() => {
			expect(trigger).toHaveFocus();
		});
		trigger.remove();
		unmount();
	});

	it('activates game toggles with provided handlers', async () => {
		const onToggleAutoAcknowledge = vi.fn();
		const onToggleAutoPass = vi.fn();
		const props = createProps({
			onToggleAutoAcknowledge,
			onToggleAutoPass,
		});
		const { rerender, unmount } = render(<SettingsDialog {...props} />);
		const gameTab = await screen.findByRole('button', {
			name: 'Game',
		});
		fireEvent.click(gameTab);
		const acknowledgeSwitch = screen.getByRole('switch', {
			name: 'Auto-Acknowledge Action Summaries',
		});
		const passSwitch = screen.getByRole('switch', {
			name: 'Auto-end turn',
		});
		fireEvent.click(acknowledgeSwitch);
		expect(onToggleAutoAcknowledge).toHaveBeenCalledTimes(1);
		fireEvent.click(passSwitch);
		expect(onToggleAutoPass).toHaveBeenCalledTimes(1);
		rerender(<SettingsDialog {...props} open={false} />);
		unmount();
	});
});
