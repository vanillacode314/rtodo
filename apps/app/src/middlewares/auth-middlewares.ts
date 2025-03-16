import { Session, User } from 'better-auth/types';
import { Context } from 'elysia';

import { auth } from '~/utils/auth';

export const userMiddleware = async (c: Context) => {
	const session = await auth.api.getSession({ headers: c.request.headers });

	if (!session) {
		c.set.status = 401;
		return {
			message: 'Unauthorized Access: Token is missing',
			success: 'error'
		};
	}

	return {
		session: session.session,
		user: session.user
	};
};

export const userInfo = (user: null | User, session: null | Session) => {
	return {
		session: session,
		user: user
	};
};
