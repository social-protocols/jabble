import { type DataFunctionArgs, redirect } from '@remix-run/node'
import { db } from '#app/db.ts'
import { logout, requireUserId } from '#app/utils/auth.server.ts'

export async function loader({ request }: DataFunctionArgs) {
	const userId = await requireUserId(request)
	const user = await db
		.selectFrom('User')
		.where('id', '=', userId)
		.selectAll()
		.executeTakeFirst()

	if (!user) {
		const requestUrl = new URL(request.url)
		const loginParams = new URLSearchParams([
			['redirectTo', `${requestUrl.pathname}${requestUrl.search}`],
		])
		const redirectTo = `/login?${loginParams}`
		await logout({ request, redirectTo })
		return redirect(redirectTo)
	}
	return redirect(`/users/${user.username}`)
}
