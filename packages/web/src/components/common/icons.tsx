import React from 'react';

interface IconProps {
	className?: string;
}

const defaultClass = 'h-5 w-5';

const iconClassName = (className?: string) => className ?? defaultClass;

export function SettingsIcon({ className }: IconProps) {
	return (
		<svg
			aria-hidden
			className={iconClassName(className)}
			fill="none"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			stroke="currentColor"
			strokeWidth={1.6}
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M5 6h14" />
			<path d="M9 6v12" />
			<circle cx={9} cy={12} r={2.6} />
			<path d="M19 18h-6" />
			<path d="M15 18V6" />
			<circle cx={15} cy={9} r={2.6} />
		</svg>
	);
}

export function ExitDoorIcon({ className }: IconProps) {
	return (
		<svg
			aria-hidden
			className={iconClassName(className)}
			fill="none"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			stroke="currentColor"
			strokeWidth={1.6}
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M5 5h7v14H5z" />
			<path d="M12 12h7" />
			<path d="M17.5 8.5 21 12l-3.5 3.5" />
			<path d="M8.5 12H10" />
		</svg>
	);
}

export function ArrowLeftIcon({ className }: IconProps) {
	return (
		<svg
			aria-hidden
			className={iconClassName(className)}
			fill="none"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			stroke="currentColor"
			strokeWidth={1.6}
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M5 12h14" />
			<path d="m10 7-5 5 5 5" />
		</svg>
	);
}

export function ArrowRightIcon({ className }: IconProps) {
	return (
		<svg
			aria-hidden
			className={iconClassName(className)}
			fill="none"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			stroke="currentColor"
			strokeWidth={1.6}
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M5 12h14" />
			<path d="m14 7 5 5-5 5" />
		</svg>
	);
}

export function PlayIcon({ className }: IconProps) {
	return (
		<svg
			aria-hidden
			className={iconClassName(className)}
			fill="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path d="M9 6v12l9-6z" />
		</svg>
	);
}

export function HammerIcon({ className }: IconProps) {
	return (
		<svg
			aria-hidden
			className={iconClassName(className)}
			fill="none"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			stroke="currentColor"
			strokeWidth={1.6}
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="m6 12 7.5-7.5 3 3L9 15" />
			<path d="m9 15 3 3" />
			<path d="M6 12 4.5 13.5" />
		</svg>
	);
}

export function BookIcon({ className }: IconProps) {
	return (
		<svg
			aria-hidden
			className={iconClassName(className)}
			fill="none"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			stroke="currentColor"
			strokeWidth={1.6}
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M5.5 5H11a2 2 0 0 1 2 2v13" />
			<path d="M19 5h-5.5a2 2 0 0 0-2 2v13" />
			<path d="M5.5 5v15a2 2 0 0 1 2-2H13" />
			<path d="M19 5v15a2 2 0 0 0-2-2h-5.5" />
		</svg>
	);
}

export function MapIcon({ className }: IconProps) {
	return (
		<svg
			aria-hidden
			className={iconClassName(className)}
			fill="none"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			stroke="currentColor"
			strokeWidth={1.6}
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="m4.5 6 6-2 6 2 3-1v15l-3 1-6-2-6 2V6z" />
			<path d="M10.5 4v15" />
			<path d="M16.5 6v15" />
		</svg>
	);
}

export function CheckIcon({ className }: IconProps) {
	return (
		<svg
			aria-hidden
			className={iconClassName(className)}
			fill="none"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			stroke="currentColor"
			strokeWidth={1.6}
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="m5.5 13.5 4 4 9-9" />
		</svg>
	);
}

export function CloseIcon({ className }: IconProps) {
	return (
		<svg
			aria-hidden
			className={iconClassName(className)}
			fill="none"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			stroke="currentColor"
			strokeWidth={1.6}
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M7 7l10 10" />
			<path d="M17 7 7 17" />
		</svg>
	);
}
