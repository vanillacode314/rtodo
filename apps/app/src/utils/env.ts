import { type } from 'arktype';

const envSchema = type({
	'+': 'delete',
	BETTER_AUTH_SECRET: '128 <= string <= 128',
	BETTER_AUTH_TRUSTED_ORIGINS: type('string > 0')
		.pipe((v) => v.split(','))
		.to('string.url[]'),
	DATABASE_AUTH_TOKEN: 'string > 0',
	DATABASE_CONNECTION_URL: 'string.url',
	NOTIFICATIONS_EMAIL_ADDRESS: 'string > 0',
	RESEND_API_KEY: 'string > 0'
});

const env = envSchema(process.env) as typeof envSchema.infer;
if (env instanceof type.errors) {
	throw new Error(`Invalid Env: ${env.summary}`);
}

export { env };
