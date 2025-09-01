import './index.css';
import { createRoot } from 'react-dom/client';
import App from './App';
import { RESOURCES, Resource } from '@kingdom-builder/contents';

const castleIcon = RESOURCES[Resource.castleHP].icon;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${castleIcon}</text></svg>`;
const link =
  document.querySelector<HTMLLinkElement>('#favicon') ??
  document.createElement('link');
link.id = 'favicon';
link.rel = 'icon';
link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
document.head.appendChild(link);

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
