import { useCallback, useEffect, useMemo, useRef } from 'react';

interface WindowWithWebkitAudioContext extends Window {
	webkitAudioContext?: typeof AudioContext;
}

interface UseSoundEffectsOptions {
	enabled: boolean;
}

interface SoundEffectHandlers {
	playResolutionSpawn: () => void;
	playTranslationTick: () => void;
	playUiClick: () => void;
}

function disconnectNodes(nodes: Array<AudioNode | null>) {
	nodes.forEach((node) => {
		try {
			node?.disconnect();
		} catch {
			/* noop */
		}
	});
}

export function useSoundEffects({
	enabled,
}: UseSoundEffectsOptions): SoundEffectHandlers {
	const contextRef = useRef<AudioContext | null>(null);
	const enabledRef = useRef(enabled);
	enabledRef.current = enabled;

	useEffect(() => {
		const context = contextRef.current;
		if (!context) {
			return;
		}
		if (!enabled && context.state === 'running') {
			void context.suspend();
			return;
		}
		if (enabled && context.state === 'suspended') {
			void context.resume();
		}
	}, [enabled]);

	useEffect(
		() => () => {
			const context = contextRef.current;
			if (!context) {
				return;
			}
			if (context.state !== 'closed') {
				void context.close();
			}
			contextRef.current = null;
		},
		[],
	);

	const ensureContext = useCallback((): AudioContext | null => {
		if (typeof window === 'undefined') {
			return null;
		}
		const existing = contextRef.current;
		if (existing) {
			if (enabledRef.current && existing.state === 'suspended') {
				void existing.resume();
			}
			return existing;
		}
		const ctor =
			window.AudioContext ??
			(window as WindowWithWebkitAudioContext).webkitAudioContext ??
			null;
		if (!ctor) {
			return null;
		}
		const context = new ctor();
		contextRef.current = context;
		if (!enabledRef.current) {
			void context.suspend();
		}
		return context;
	}, []);

	const play = useCallback(
		(renderer: (context: AudioContext, startTime: number) => void) => {
			if (!enabledRef.current) {
				return;
			}
			const context = ensureContext();
			if (!context) {
				return;
			}
			const startTime = context.currentTime + 0.005;
			renderer(context, startTime);
		},
		[ensureContext],
	);

	const playResolutionSpawn = useCallback(() => {
		play((context, startTime) => {
			const oscillator = context.createOscillator();
			const gain = context.createGain();

			oscillator.type = 'sine';
			oscillator.frequency.setValueAtTime(520, startTime);
			oscillator.frequency.exponentialRampToValueAtTime(180, startTime + 0.24);

			gain.gain.setValueAtTime(0.0001, startTime);
			gain.gain.linearRampToValueAtTime(0.16, startTime + 0.03);
			gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.36);

			oscillator.connect(gain);
			gain.connect(context.destination);

			oscillator.onended = () => {
				disconnectNodes([oscillator, gain]);
			};

			oscillator.start(startTime);
			oscillator.stop(startTime + 0.38);
		});
	}, [play]);

	const playTranslationTick = useCallback(() => {
		play((context, startTime) => {
			const oscillator = context.createOscillator();
			const gain = context.createGain();

			oscillator.type = 'triangle';
			oscillator.frequency.setValueAtTime(1600, startTime);
			oscillator.frequency.exponentialRampToValueAtTime(420, startTime + 0.08);

			gain.gain.setValueAtTime(0.0001, startTime);
			gain.gain.linearRampToValueAtTime(0.1, startTime + 0.01);
			gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.12);

			oscillator.connect(gain);
			gain.connect(context.destination);

			oscillator.onended = () => {
				disconnectNodes([oscillator, gain]);
			};

			oscillator.start(startTime);
			oscillator.stop(startTime + 0.14);
		});
	}, [play]);

	const playUiClick = useCallback(() => {
		play((context, startTime) => {
			const oscillator = context.createOscillator();
			const gain = context.createGain();

			oscillator.type = 'sine';
			oscillator.frequency.setValueAtTime(880, startTime);
			oscillator.frequency.exponentialRampToValueAtTime(260, startTime + 0.18);

			gain.gain.setValueAtTime(0.0001, startTime);
			gain.gain.linearRampToValueAtTime(0.14, startTime + 0.015);
			gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.22);

			oscillator.connect(gain);
			gain.connect(context.destination);

			oscillator.onended = () => {
				disconnectNodes([oscillator, gain]);
			};

			oscillator.start(startTime);
			oscillator.stop(startTime + 0.24);
		});
	}, [play]);

	return useMemo(
		() => ({ playResolutionSpawn, playTranslationTick, playUiClick }),
		[playResolutionSpawn, playTranslationTick, playUiClick],
	);
}
