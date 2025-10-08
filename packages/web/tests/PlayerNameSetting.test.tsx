/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { PlayerNameSetting } from '../src/components/settings/PlayerNameSetting';

describe('PlayerNameSetting', () => {
	it('closes the dialog when the settings panel closes', async () => {
		const handleSave = vi.fn();
		const { rerender } = render(
			<PlayerNameSetting
				open={true}
				playerName="Traveler"
				onSave={handleSave}
			/>,
		);

		fireEvent.click(screen.getByRole('button', { name: /change/i }));
		expect(
			screen.getByRole('dialog', {
				name: /player name/i,
			}),
		).toBeInTheDocument();

		rerender(
			<PlayerNameSetting
				open={false}
				playerName="Traveler"
				onSave={handleSave}
			/>,
		);

		await waitFor(() => {
			expect(
				screen.queryByRole('dialog', {
					name: /player name/i,
				}),
			).not.toBeInTheDocument();
		});
	});
});
