import './styles/index.css';
import { createRoot } from 'react-dom/client';
import App from './App';
import { resolvePrimaryIcon } from './startup/resolvePrimaryIcon';
import { loadRuntimeBootstrap } from './startup/runtimeBootstrap';
import { setSessionBootstrap } from './state/sessionBootstrap';

const createFaviconSvg = (emoji: string): string =>
	[
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">',
		'<text y=".9em" font-size="90">',
		emoji,
		'</text>',
		'</svg>',
	].join('');

const ensureFaviconLink = (): HTMLLinkElement => {
	const existing = document.querySelector<HTMLLinkElement>('#favicon');
	if (existing) {
		return existing;
	}
	const link = document.createElement('link');
	link.id = 'favicon';
	return link;
};

async function bootstrap() {
	const bootstrapConfig = await loadRuntimeBootstrap();
	setSessionBootstrap(bootstrapConfig);
	const icon = resolvePrimaryIcon({
		primaryResourceId: bootstrapConfig.primaryResourceId ?? null,
		metadata: bootstrapConfig.resourceMetadata,
	});
	if (icon) {
		const svg = createFaviconSvg(icon);
		const link = ensureFaviconLink();
		link.rel = 'icon';
		link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
		if (!link.parentElement) {
			document.head.appendChild(link);
		}
	} else {
		console.warn('Unable to resolve favicon icon from runtime metadata.');
	}
	const container = document.getElementById('root');
	if (!container) {
		throw new Error('Root element not found.');
	}
	const root = createRoot(container);
	root.render(<App />);
}

void bootstrap();
