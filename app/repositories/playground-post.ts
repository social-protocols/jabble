import { DB } from "#app/types/kysely-types.ts";
import { PlaygroundPost } from "#app/types/api-types.ts";
import { FallacyList, FallacyListSchema } from "#app/utils/fallacy_detection.ts";
import { Transaction } from "kysely";

export async function storePlaygroundPost(trx: Transaction<DB>, content: string, detection: FallacyList): Promise<PlaygroundPost> {
	
	const playgroundPost = await trx
		.insertInto("PlaygroundPost")
		.values({
			content: content,
			detection: JSON.stringify(detection)
		})
		.returningAll()
		.executeTakeFirstOrThrow()

	return {
		id: playgroundPost.id,
		content: content,
		detection: detection,
		createdAt: playgroundPost.createdAt,
	}
}

export async function getNLatestPlaygroundPosts(trx: Transaction<DB>, n: number) {
	const results = await trx
		.selectFrom("PlaygroundPost")
		.orderBy("createdAt desc")
		.limit(n)
		.selectAll()
		.execute()

	return results.map(res => {
		return {
			id: res.id,
			content: res.content,
			detection: FallacyListSchema.parse(JSON.parse(res.detection)),
			createdAt: res.createdAt,
		}
	})
}
