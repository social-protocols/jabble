import { redirect, type ActionFunctionArgs } from '@remix-run/node'
import { logout } from '#app/utils/auth.server.ts'

export function loader() {
	return redirect('/')
}

export async function action({ request }: ActionFunctionArgs) {
	return await logout({ request })
}
