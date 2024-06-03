import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await sql`drop view FullScore`.execute(db)
	await sql`
        create view FullScore as
        select
              score.voteEventTime
            , score.postId
            , topNoteId
            , criticalThreadId
            , o
            , oCount
            , oSize
            , score.p
            , pCount
            , pSize
            , q
            , qCount
            , qSize
            , r
            , score
        from Score
        left join Effect 
            on Effect.postId = Score.postId
            and noteId = topNoteId;
    `.execute(db)
}
