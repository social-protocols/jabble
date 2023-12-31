import { redirect, type DataFunctionArgs } from '@remix-run/node'
import { requireUserId, logout } from '#app/utils/auth.server.ts'
import { db } from '#app/db.ts'

export async function loader({ request }: DataFunctionArgs) {
	const userId = await requireUserId(request)
	// const user = await prisma.user.findUnique({ where: { id: userId } })
	const user = await db.selectFrom('User').where('id', '=', userId).selectAll().executeTakeFirst()

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
