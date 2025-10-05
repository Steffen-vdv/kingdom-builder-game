import React from 'react';

export type ActionCardOption = {
	id: string;
	label: string;
	icon?: string;
	summary?: string;
	description?: string;
	disabled?: boolean;
	onSelect: () => void;
	onMouseEnter?: (() => void) | undefined;
	onMouseLeave?: (() => void) | undefined;
	compact?: boolean;
};

function buildOptionClass(option: ActionCardOption): string {
	return [
		'action-card__option',
		option.compact ? 'action-card__option--compact' : '',
		option.disabled ? 'opacity-50 cursor-not-allowed' : 'hoverable',
	]
		.filter(Boolean)
		.join(' ');
}

export default function OptionCard({
	option,
}: {
	option: ActionCardOption;
}): JSX.Element {
	const icon = option.icon?.trim();
	const label = option.label.trim();
	const ariaLabel = label.length > 0 ? label : option.id;
	const optionClass = buildOptionClass(option);
	const compactVisual = icon || (label.length > 0 ? label[0] : '–');

	return (
		<button
			type="button"
			className={optionClass}
			onClick={option.disabled ? undefined : option.onSelect}
			disabled={option.disabled}
			style={{ cursor: option.disabled ? 'not-allowed' : 'pointer' }}
			onMouseEnter={option.onMouseEnter}
			onMouseLeave={option.onMouseLeave}
			aria-label={ariaLabel}
			title={option.compact ? ariaLabel : undefined}
		>
			{option.compact ? (
				<>
					<span
						aria-hidden="true"
						className="action-card__option-compact-visual"
					>
						{compactVisual}
					</span>
					<span className="sr-only">{ariaLabel}</span>
				</>
			) : (
				<>
					<span className="action-card__option-header">
						{icon ? (
							<span aria-hidden="true" className="action-card__option-icon">
								{icon}
							</span>
						) : null}
						<span className="action-card__option-title">{label}</span>
					</span>
					{option.summary ? (
						<p className="action-card__option-summary">{option.summary}</p>
					) : null}
					{option.description ? (
						<p className="action-card__option-description">
							{option.description}
						</p>
					) : null}
				</>
			)}
		</button>
	);
}
