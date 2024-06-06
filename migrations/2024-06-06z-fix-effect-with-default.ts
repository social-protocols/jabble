import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	db.transaction().execute(async trx => {
		await sql`drop view EffectWithDefault`.execute(trx)

		await sql`
		  create view EffectWithDefault as
		  select
		     ancestorId as postId
		     , descendantId as commentId
		     , topSubthreadId
		     , s.p
		     , coalesce(effect.pCount, s.oCount, 0) pCount
		     , coalesce(effect.pSize, s.oCount, 0) pSize
		     , coalesce(effect.q, s.o, 0.5) q
		     , coalesce(effect.qCount, s.oCount, 0.5) qCount
		     , coalesce(effect.qSize, s.oSize, 0.5) qSize
		     , coalesce(effect.r, s.o, 0.5) r
		  from ScoreWithDefault s
		  join Lineage
		      on ancestorId = s.postId
		  left join Effect on
		      Effect.postId = ancestorId 
		      and Effect.commentId = descendantId
		  ;
		`.execute(trx)
	})
}
