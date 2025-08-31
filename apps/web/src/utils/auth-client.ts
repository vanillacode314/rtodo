import {
	anonymousClient,
	jwtClient,
	magicLinkClient,
	multiSessionClient,
	twoFactorClient,
	usernameClient
} from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/solid';
import { createMemo } from 'solid-js';

const authClient = createAuthClient({
	plugins: [
		anonymousClient(),
		jwtClient(),
		magicLinkClient(),
		multiSessionClient(),
		twoFactorClient(),
		usernameClient()
	],
	basePath: '/api/v1/auth'
});

const session = authClient.useSession();
const loggedIn = createMemo(() => session().data !== null);
export { authClient, loggedIn, session };
