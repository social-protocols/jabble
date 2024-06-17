import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await db.transaction().execute(async trx => {
		await sql`drop view FullScore`.execute(trx)
		await sql`drop view ScoreWithDefault`.execute(trx)
		await sql`drop view EffectWithDefault`.execute(trx)

		await sql`drop trigger afterInsertOnScoreEvent`.execute(trx)
		await sql`drop trigger afterInsertEffectEvent`.execute(trx)

		await sql`alter table Score drop column topCommentId`.execute(trx)
		await sql`alter table Score drop column criticalThreadId`.execute(trx)
		await sql`alter table ScoreEvent drop column topCommentId`.execute(trx)
		await sql`alter table ScoreEvent drop column criticalThreadId`.execute(trx)
		await sql`alter table Effect drop column topSubthreadId`.execute(trx)
		await sql`alter table Effect add column weight real not null default 0`.execute(
			trx,
		)
		await sql`alter table EffectEvent drop column topSubthreadId`.execute(trx)
		await sql`alter table EffectEvent add column weight real not null default 0`.execute(
			trx,
		)

		await sql`delete from EffectEvent where 1=1`.execute(trx)
		await sql`delete from Effect where 1=1`.execute(trx)
		await sql`delete from ScoreEvent where 1=1`.execute(trx)
		await sql`delete from Score where 1=1`.execute(trx)

		await sql`
			create view CriticalThread as
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
			group by targetId
		`.execute(trx)

		await sql`
				create view ScoreWithDefault as
				select
						post.id as postId
						, criticalThreadId
						, ifnull(o,0.5) o
						, ifnull(oCount,0) oCount
						, ifnull(oSize,0) oSize
						, ifnull(score.p, 0.5) p
						, ifnull(score,0) score
				from Post
				left join Score
						on post.id = Score.postId
				left join CriticalThread 
					on post.id = CriticalThread.targetId
				;
		`.execute(trx)

		await sql`
			create view EffectWithDefault as
			select
				 ancestorId as postId
				 , descendantId as commentId
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
		`.execute(trx)

		await sql`
			create view FullScore as
			select
					post.id as postId
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
					, weight
			from post
			join ScoreWithDefault score
					on post.id = score.postId
			left join Effect
					on Effect.postId = Score.postId
					and Effect.commentId = criticalThreadId
			`.execute(trx)

		await sql`
			CREATE TRIGGER afterInsertOnScoreEvent after insert on ScoreEvent
				begin
					insert or replace into Score values (
							new.voteEventId
						, new.voteEventTime
						, new.postId
						, new.o
						, new.oCount
						, new.oSize
						, new.p
						, new.score
					);
			end;
		`.execute(trx)

		await sql`
			CREATE TRIGGER afterInsertEffectEvent after insert on EffectEvent begin
				insert or replace into Effect
				values (
					new.voteEventId,
					new.voteEventTime,
					new.postId,
					new.commentId,
					new.p,
					new.pCount,
					new.pSize,
					new.q,
					new.qCount,
					new.qSize,
					new.r,
					new.weight
				);
			end;
		`.execute(trx)
	})
}
