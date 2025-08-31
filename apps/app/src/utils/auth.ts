import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink } from 'better-auth/plugins';

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
			sendMagicLink: ({ email, url }) => {
				resend.emails.send({
					from: env.NOTIFICATIONS_EMAIL_ADDRESS,
					subject: 'RSuite - Sign In Request',
					tags: [
						{
							name: 'category',
							value: 'sign-in'
						}
					],
					text: `Goto this link to sign in: ${url}. If you did not request sign in, you can safely ignore this email.`,
					to: [email]
				});
			}
		})
	],
	session: {
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60
		},
		expiresIn: 60 * 60 * 24 * 180,
		updateAge: 60 * 60 * 24
	},
	trustedOrigins: env.BETTER_AUTH_TRUSTED_ORIGINS
});
