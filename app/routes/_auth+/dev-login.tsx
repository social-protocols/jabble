import { type DataFunctionArgs } from '@remix-run/server-runtime'
import { login } from '#app/utils/auth.server.ts'
import { handleNewSession } from './login.tsx'
import { invariant } from '#app/utils/misc.tsx'

export async function loader({ request }: DataFunctionArgs) {
	const session = await login({
		username: 'developer',
		password: 'password',
	})

	invariant(session, `Session is null or undefined for this request: ${request}`)
	invariant(session.userId, `No userId in session for this request: ${request}`)

	const validSession = {
		...session,
		userId: session.userId,
	}

	const args = {
		request: request,
		session: {
			...validSession,
			expirationDate: new Date(session.expirationDate),
		},
		remember: true,
		redirectTo: '/',
	}

	const result = await handleNewSession(args)

	return result
}
