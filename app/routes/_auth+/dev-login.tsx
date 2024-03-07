import { type DataFunctionArgs } from "@remix-run/server-runtime"
import { login } from "#app/utils/auth.server.ts"
import { handleNewSession } from "./login.tsx"

export async function loader({ request }: DataFunctionArgs) {

	const session = await login({
		username:"developer",
		password:"password"
	})

	if (session === null) {
		throw new Error("Session userId is undefined")
	}

	if (session.userId === undefined) {
		throw new Error("Session userId is undefined")
	}

	const validSession = {
		...session,
		userId: session.userId
	}

	const args = {
		request: request,
		session: {
			...validSession,
			expirationDate: new Date(session!.expirationDate),
		},
		remember: true,
		redirectTo: "/",
	};

	return await handleNewSession(args)
}