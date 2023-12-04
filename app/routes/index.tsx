// import { Link, useLocation } from '@remix-run/react'
// import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
// import { Icon } from '#app/components/ui/icon.tsx'

import { useLoaderData } from "@remix-run/react"
import { requireUserId, logout } from '#app/utils/auth.server.ts'
import { type DataFunctionArgs } from '@remix-run/node'

// export async function loader() {
// }

export default function Index() {
	// due to the loader, this component will never be rendered, but we'll return
	// the error boundary just in case.
  let data = useLoaderData()
  console.log(data)

	return (
    <div>
      <div>This is the home page</div>
    </div>
  )
}

export async function loader({ request }: DataFunctionArgs) {
	const userId = await requireUserId(request)
  console.log('userId', userId)
  
	return (
    { userId: userId }
  )
}
