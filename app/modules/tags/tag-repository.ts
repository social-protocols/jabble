import { DB } from "#app/types/kysely-types.ts";
import { Transaction } from "kysely";
import { Tag } from "./tag-types.ts";

export async function insertTag(trx: Transaction<DB>, tag: string): Promise<Tag> {
	await trx
		.insertInto('Tag')
		.values({ tag })
		.onConflict(oc => oc.column('tag').doNothing())
		.returningAll()
		.executeTakeFirstOrThrow()

	return getTag(trx, tag)
}

export async function getTag(trx: Transaction<DB>, tag: string): Promise<Tag> {
	return await trx
		.selectFrom('Tag')
		.where('tag', '=', tag)
		.selectAll()
		.executeTakeFirstOrThrow()
}

export async function insertPostTag(trx: Transaction<DB>, postId: number, tagId: number): Promise<void> {
	await trx
		.insertInto('PostTag')
		.values({ postId, tagId })
		.onConflict(oc => oc.doNothing())
		.execute()
}
