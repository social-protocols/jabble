import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await db.transaction().execute(async trx => {
		await sql`drop view CriticalThread`.execute(trx)

		await sql`
			create view CriticalThreadView as
			with topCommentThread as (
					select
							postId as targetId
							, parentId
							, commentId as topCommentId
							, separation
							, max(weight) as weight
					from
							effect
							join post on (effect.commentId = post.id)
							join lineage on (postId = ancestorId and post.id = descendantId)
					group by targetId, parentId
					having weight > 0
			)
			select
					targetId
					, topCommentId as criticalThreadId
					, max(separation) as depth
			from topCommentThread
			group by targetId;
		`.execute(trx)

		await sql`
			create table CriticalThread (
				targetId integer primary key
				, criticalThreadId integer not null
				, depth integer not null
			) strict
		`.execute(trx)

		await sql`
				insert into CriticalThread
				select * from CriticalThreadView
		`.execute(trx)
	})
}
