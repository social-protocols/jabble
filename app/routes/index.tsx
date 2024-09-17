import { Link, useLoaderData } from '@remix-run/react'

// export async function loader() {
// 	const testContent = "TEST CONTENT"
// 	return { testContent }
// }

export default function ClaimExtraction() {
	// const { testContent } = useLoaderData<typeof loader>()

	return (
		<Link
			className="rounded-lg bg-red-200 p-4 hover:bg-red-700"
			to={'/submit-factcheck'}
		>
			submit a fact-check request
		</Link>
	)
}
