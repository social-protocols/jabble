import { redirect } from '@remix-run/server-runtime'

export function loader() {
	return redirect('/polls')
}
