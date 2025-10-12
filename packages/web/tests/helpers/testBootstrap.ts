import { createDefaultBootstrapConfig } from '../../src/startup/defaultBootstrap';
import {
	setSessionBootstrap,
	resetSessionBootstrapForTest,
} from '../../src/state/sessionBootstrap';

export function configureTestBootstrap() {
	setSessionBootstrap(createDefaultBootstrapConfig());
}

export function resetTestBootstrap() {
	resetSessionBootstrapForTest();
}
