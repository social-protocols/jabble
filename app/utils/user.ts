import { type SerializeFrom } from '@remix-run/node'
import { useRouteLoaderData } from '@remix-run/react'
import { type loader as rootLoader } from '#app/root.tsx'
import { type User } from '#app/types/api-types.ts'

function isUser(user: any): user is SerializeFrom<typeof rootLoader>['user'] {
	return user && typeof user === 'object' && typeof user.id === 'string'
}

export function useOptionalUser(): User | null {
	const data = useRouteLoaderData<typeof rootLoader>('root')
	if (!data || !isUser(data.user)) {
		return null
	}
	return data.user
}

export function useUser() {
	const maybeUser = useOptionalUser()
	if (!maybeUser) {
		throw new Error(
			'No user found in root loader, but user is required by useUser. If user is optional, try useOptionalUser instead.',
		)
	}
	return maybeUser
}
