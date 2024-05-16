import assert from 'assert'
import { LoaderFunctionArgs } from '@remix-run/server-runtime'
import { login } from '#app/utils/auth.server.ts'
import { handleNewSession } from './login.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
	const session = await login({
		username: 'developer',
		password: 'password',
	})

	assert(session !== null, 'Session is null')
	assert(session.userId !== undefined, 'session.userId is defined')

	const validSession = {
		...session,
		userId: session.userId,
	}

	const args = {
		request: request,
		session: {
			...validSession,
			expirationDate: new Date(session!.expirationDate),
		},
		remember: true,
		redirectTo: '/',
	}

	const result = await handleNewSession(args)

	return result
}
