import React, { useId } from 'react';

interface TimerCircleProps {
	progress: number;
	paused?: boolean;
}

const TimerCircle: React.FC<TimerCircleProps> = ({
	progress,
	paused = false,
}) => {
	const id = useId();
	const size = 36;
	const strokeWidth = 4;
	const radius = size / 2 - strokeWidth / 2;
	const circumference = 2 * Math.PI * radius;
	const clampedProgress = Number.isFinite(progress)
		? Math.max(0, Math.min(1, progress))
		: 0;
	const strokeDashoffset = (1 - clampedProgress) * circumference;

	const pauseBarWidth = 4;
	const pauseBarHeight = 14;
	const pauseBarY = size / 2 - pauseBarHeight / 2;

	return (
		<svg
			width={size}
			height={size}
			viewBox={`0 0 ${size} ${size}`}
			role="img"
			aria-hidden
			className="text-blue-500"
		>
			<title>
				{paused
					? 'Auto-resolution paused'
					: `Auto-resolution ${Math.round(clampedProgress * 100)}%`}
			</title>
			<defs>
				<radialGradient id={`${id}-bg`} cx="50%" cy="50%" r="65%">
					<stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
					<stop offset="100%" stopColor="rgba(226,232,240,0.35)" />
				</radialGradient>
				<linearGradient id={`${id}-track`} x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stopColor="rgba(148,163,184,0.45)" />
					<stop offset="100%" stopColor="rgba(148,163,184,0.2)" />
				</linearGradient>
				<linearGradient
					id={`${id}-progress`}
					x1="0%"
					y1="0%"
					x2="100%"
					y2="100%"
				>
					<stop offset="0%" stopColor="#60a5fa" />
					<stop offset="100%" stopColor="#a855f7" />
				</linearGradient>
			</defs>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={radius}
				fill={`url(#${id}-bg)`}
				opacity={0.85}
			/>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={radius}
				stroke={`url(#${id}-track)`}
				strokeWidth={strokeWidth}
				fill="none"
			/>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={radius}
				stroke={`url(#${id}-progress)`}
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				fill="none"
				strokeDasharray={circumference}
				strokeDashoffset={strokeDashoffset}
				transform={`rotate(-90 ${size / 2} ${size / 2})`}
			/>
			{paused ? (
				<g>
					<rect
						x={size / 2 - pauseBarWidth - 2}
						y={pauseBarY}
						width={pauseBarWidth}
						height={pauseBarHeight}
						rx={2}
						fill="#38bdf8"
					/>
					<rect
						x={size / 2 + 2}
						y={pauseBarY}
						width={pauseBarWidth}
						height={pauseBarHeight}
						rx={2}
						fill="#38bdf8"
					/>
				</g>
			) : (
				<circle
					cx={size / 2}
					cy={size / 2}
					r={4}
					fill="#1d4ed8"
					opacity={0.85}
				/>
			)}
		</svg>
	);
};

export default TimerCircle;
