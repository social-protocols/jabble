import { type LoaderFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/react'
import { z } from 'zod'
import { db } from '#app/db.ts'
import { syncWithHN } from '#app/modules/hacker-news/hacker-news-service.ts'

const hnIdSchema = z.coerce.number()

export async function loader({ params }: LoaderFunctionArgs) {
	const hnId = hnIdSchema.parse(params.hnId)
	const postId: number = await db
		.transaction()
		.execute(async trx => await syncWithHN(trx, hnId))
	return redirect(`/post/${postId}`)
}
