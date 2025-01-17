import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import {
	loadRhetorics,
	RhetoricalElementDetail,
	type RhetoricalElement,
} from './rhetorics.tsx'

export async function loader({ params }: LoaderFunctionArgs) {
	const id = params.id
	if (!id) {
		return json({ id: null })
	}
	const response = await loadRhetorics()
	const rhetorics = await response.json()
	const rhetoric = rhetorics.find(rhetoric => rhetoric.id === id)
	if (!rhetoric) {
		return json({ id: null })
	}
	return json(rhetoric)
}

export default function RhetoricPage() {
	const rhetoric = useLoaderData() as RhetoricalElement

	return <RhetoricalElementDetail {...rhetoric} />
}
