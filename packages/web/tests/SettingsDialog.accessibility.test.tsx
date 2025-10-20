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
		const audioTab = screen.getByRole('button', { name: 'Audio' });
		const gameplayTab = screen.getByRole('button', { name: 'Gameplay' });
		const user = userEvent.setup();
		await user.tab({ shift: true });
		expect(closeButton).toHaveFocus();
		await user.tab();
		expect(generalTab).toHaveFocus();
		gameplayTab.focus();
		await user.tab({ shift: true });
		expect(audioTab).toHaveFocus();
		await user.tab();
		expect(gameplayTab).toHaveFocus();
		closeButton.focus();
		await user.tab();
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

	it('activates gameplay toggles when clicked', async () => {
		const onToggleAutoAcknowledge = vi.fn();
		const onToggleAutoPass = vi.fn();
		const props = createProps({
			onToggleAutoAcknowledge,
			onToggleAutoPass,
		});
		const { unmount } = render(<SettingsDialog {...props} />);
		const gameplayTab = screen.getByRole('button', { name: 'Gameplay' });
		fireEvent.click(gameplayTab);
		const autoAcknowledgeSwitch = await screen.findByRole('switch', {
			name: 'Automatically acknowledge',
		});
		const autoPassSwitch = await screen.findByRole('switch', {
			name: 'Automatically pass turn',
		});
		fireEvent.click(autoAcknowledgeSwitch);
		fireEvent.click(autoPassSwitch);
		expect(onToggleAutoAcknowledge).toHaveBeenCalledTimes(1);
		expect(onToggleAutoPass).toHaveBeenCalledTimes(1);
		unmount();
	});
});
