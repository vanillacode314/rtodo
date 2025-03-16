import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { anonymous, jwt, magicLink, multiSession, twoFactor, username } from 'better-auth/plugins';

import { db } from '~/db/client';

import { env } from './env';
import { resend } from './resend';

export const auth = betterAuth({
	basePath: '/api/v1/auth',
	database: drizzleAdapter(db, { provider: 'sqlite' }),
	emailVerification: {
		autoSignInAfterVerification: true,
		sendOnSignUp: true
	},
	plugins: [
		magicLink({
			sendMagicLink: async ({ email, url }) => {
				resend.emails.send({
					from: env.NOTIFICATIONS_EMAIL_ADDRESS,
					subject: 'RSuite - Confirm your email',
					tags: [
						{
							name: 'category',
							value: 'email-verification'
						}
					],
					text: `Goto this link to confirm your email: ${url}. If you did not sign up, you can safely ignore this email.`,
					to: [email]
				});
			}
		}),
		jwt(),
		twoFactor(),
		username(),
		anonymous({
			onLinkAccount: async ({ anonymousUser, newUser }) => {}
		}),
		multiSession()
	],
	session: {
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60
		}
	},
	trustedOrigins: env.BETTER_AUTH_TRUSTED_ORIGINS
});
