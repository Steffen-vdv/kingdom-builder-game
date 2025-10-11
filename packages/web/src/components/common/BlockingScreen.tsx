import React from 'react';

interface BlockingScreenProps {
	title: string;
	description?: string;
	children?: React.ReactNode;
}

export default function BlockingScreen({
	title,
	description,
	children,
}: BlockingScreenProps) {
	return (
		<div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-amber-100 via-rose-100 to-sky-100 px-6 py-12 text-center text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
			<div className="w-full max-w-3xl rounded-3xl border border-white/50 bg-white/70 p-8 shadow-2xl shadow-rose-200/40 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/70 dark:shadow-slate-900/60">
				<h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
				{description ? (
					<p className="mt-4 text-base text-slate-600 dark:text-slate-300">
						{description}
					</p>
				) : null}
				{children ? (
					<div className="mt-8 flex flex-col items-center gap-6">
						{children}
					</div>
				) : null}
			</div>
		</div>
	);
}
