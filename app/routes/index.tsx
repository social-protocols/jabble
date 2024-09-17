import { useLoaderData } from '@remix-run/react'

export async function loader() {
	const testContent = "TEST CONTENT"
	return { testContent }
}

export default function ClaimExtraction() {
	const { testContent } = useLoaderData<typeof loader>()

	return (
		<div>{testContent}</div>
	)
}
