import './index.css';
import { createRoot } from 'react-dom/client';
import App from './App';
import { PRIMARY_ICON_ID, RESOURCES } from '@kingdom-builder/contents';
import { resolvePrimaryIcon } from './startup/resolvePrimaryIcon';

const icon = resolvePrimaryIcon(RESOURCES, PRIMARY_ICON_ID);
if (icon) {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${icon}</text></svg>`;
	const link =
		document.querySelector<HTMLLinkElement>('#favicon') ??
		document.createElement('link');
	link.id = 'favicon';
	link.rel = 'icon';
	link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
	document.head.appendChild(link);
} else {
	console.warn('Unable to resolve favicon icon from content.');
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
