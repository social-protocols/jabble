import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
	await db.transaction().execute(async trx => {
		await sql`
			with recursive ancestors as (
				select
					parentId as ancestorId
					, id as descendantId
					, 1 as separation
				from Post
				where parentId is not null
				union all
				select a.ancestorId, p.id, a.separation + 1
				from ancestors a
				join Post p on a.descendantId = p.parentId
			)
			insert or ignore into Lineage(ancestorId, descendantId, separation)
			select ancestorId, descendantId, separation
			from ancestors
		`.execute(trx)
	})
}
