import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await db.transaction().execute(async trx => {
		await sql`alter table VoteEvent drop column noteId`.execute(trx)

		await sql`alter table EffectEvent rename column noteId to commentId`.execute(
			trx,
		)
		await sql`alter table Effect rename column noteId to commentId`.execute(trx)

		await sql`drop view FullScore`.execute(trx)

		await sql`drop view ScoreWithDefault`.execute(trx)
		await sql`drop view EffectWithDefault`.execute(trx)

		await sql`alter table Score rename column topNoteId to topCommentId`.execute(
			trx,
		)
		await sql`alter table ScoreEvent rename column topNoteId to topCommentId`.execute(
			trx,
		)

		await sql`
	    create view ScoreWithDefault as
	    select
	        post.id as postId
	        , topCommentId
	        , criticalThreadId
	        , ifnull(o,0.5) o
	        , ifnull(oCount,0) oCount
	        , ifnull(oSize,0) oSize
	        , ifnull(score.p, 0.5) p
	        , ifnull(score,0) score
	    from Post
	    left join Score
	        on post.id = Score.postId
	    ;
  	   `.execute(trx)

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
		  left join Effect
		      on Effect.commentId = ancestorId
		      and Effect.postId = descendantid
		  ;
		`.execute(trx)

		await sql`
		  create view FullScore as
		  select
		      post.id as postId
		      , topCommentId
		      , criticalThreadId
		      , o
		      , oCount
		      , oSize
		      , score.p
		      , score.score
		      , ifnull(pCount,0) pCount
		      , ifnull(pSize,0) pSize
		      , ifnull(q, 0.5) q
		      , ifnull(qCount,0) qCount
		      , ifnull(qSize,0) qSize
		      , ifnull(r, 0.5) r
		  from post
		  left join ScoreWithDefault score
		      on post.id = score.postId
		  left join Effect
		      on Effect.postId = Score.postId
		      and commentId = topCommentId;
		  `.execute(trx)
	})
}
