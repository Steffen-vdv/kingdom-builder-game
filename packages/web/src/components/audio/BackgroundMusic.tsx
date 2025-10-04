import { useEffect, useRef } from 'react';

const MUSIC_SOURCE = '/audio/peaceful-theme.mp3';
const BASE_VOLUME = 0.25;

type Cleanup = () => void;

export default function BackgroundMusic({ enabled }: { enabled: boolean }) {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const resumeCleanupRef = useRef<Cleanup | null>(null);
	const fadeFrameRef = useRef<number | null>(null);

	useEffect(() => {
		return () => {
			if (fadeFrameRef.current !== null) {
				cancelAnimationFrame(fadeFrameRef.current);
				fadeFrameRef.current = null;
			}
			resumeCleanupRef.current?.();
			resumeCleanupRef.current = null;
			const audio = audioRef.current;
			if (audio) {
				audio.pause();
				audio.removeAttribute('src');
				audio.load();
			}
			audioRef.current = null;
		};
	}, []);

	useEffect(() => {
		if (typeof window === 'undefined' || typeof Audio === 'undefined') {
			return;
		}

		if (!audioRef.current) {
			const audio = new Audio(MUSIC_SOURCE);
			audio.loop = true;
			audio.preload = 'auto';
			audio.volume = BASE_VOLUME;
			audioRef.current = audio;
		}

		const audio = audioRef.current;
		if (!audio) {
			return;
		}

		const clearPendingFade = () => {
			if (fadeFrameRef.current !== null) {
				cancelAnimationFrame(fadeFrameRef.current);
				fadeFrameRef.current = null;
			}
		};

		const attachResumeListeners = () => {
			if (resumeCleanupRef.current) {
				return;
			}

			const resumePlayback = async () => {
				try {
					await audio.play();
				} catch (error) {
					const domError = error as DOMException;
					if (
						domError &&
						(domError.name === 'NotAllowedError' ||
							domError.name === 'AbortError')
					) {
						attachResumeListeners();
					}
				}
			};

			const pointerHandler = () => {
				cleanup();
				void resumePlayback();
			};
			const keyHandler = () => {
				cleanup();
				void resumePlayback();
			};
			const touchHandler = () => {
				cleanup();
				void resumePlayback();
			};

			const cleanup = () => {
				document.removeEventListener('pointerdown', pointerHandler);
				document.removeEventListener('keydown', keyHandler);
				document.removeEventListener('touchstart', touchHandler);
				resumeCleanupRef.current = null;
			};

			document.addEventListener('pointerdown', pointerHandler);
			document.addEventListener('keydown', keyHandler);
			document.addEventListener('touchstart', touchHandler);

			resumeCleanupRef.current = cleanup;
		};

		const fadeTo = (targetVolume: number, onComplete?: () => void) => {
			clearPendingFade();
			const startVolume = audio.volume;
			const duration = 300;
			const startTime = performance.now();

			const step = (time: number) => {
				const elapsed = Math.min(time - startTime, duration);
				const progress = elapsed / duration;
				const eased = progress < 1 ? 1 - Math.pow(1 - progress, 3) : 1;
				const volumeDelta = targetVolume - startVolume;
				const nextVolume = startVolume + volumeDelta * eased;
				audio.volume = nextVolume;
				if (elapsed < duration) {
					fadeFrameRef.current = requestAnimationFrame(step);
				} else {
					audio.volume = targetVolume;
					fadeFrameRef.current = null;
					onComplete?.();
				}
			};

			fadeFrameRef.current = requestAnimationFrame(step);
		};

		const stopPlayback = () => {
			resumeCleanupRef.current?.();
			resumeCleanupRef.current = null;
			fadeTo(0, () => {
				audio.pause();
				audio.volume = BASE_VOLUME;
			});
		};

		const startPlayback = async () => {
			resumeCleanupRef.current?.();
			resumeCleanupRef.current = null;
			audio.volume = 0;
			try {
				await audio.play();
				fadeTo(BASE_VOLUME);
			} catch (error) {
				const domError = error as DOMException;
				if (
					domError &&
					(domError.name === 'NotAllowedError' ||
						domError.name === 'AbortError')
				) {
					attachResumeListeners();
				}
			}
		};

		if (enabled) {
			void startPlayback();
		} else {
			stopPlayback();
		}

		return () => {
			clearPendingFade();
		};
	}, [enabled]);

	return null;
}
