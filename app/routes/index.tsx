// import { Link, useLocation } from '@remix-run/react'
// import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
// import { Icon } from '#app/components/ui/icon.tsx'

// export async function loader() {
// }

export default function Index() {
	// due to the loader, this component will never be rendered, but we'll return
	// the error boundary just in case.

	return <div>
		<div>This is the home page</div>
	</div>
}
