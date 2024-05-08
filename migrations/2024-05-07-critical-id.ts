import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await sql`drop table ScoreEvent`.execute(db)
	await sql`
        create table ScoreEvent (
            voteEventId integer not null
            , voteEventTime integer not null
            , tagId integer
            , postId integer not null
            , topNoteId integer
            , criticalThreadId integer
            , o real not null
            , oCount integer not null
            , oSize integer not null
            , p real not null
            , score real not null
            , primary key(voteEventId, postId)
        ) strict;
    `.execute(db)

	await sql`drop table Score`.execute(db)
	await sql`
        create table Score(
            voteEventId integer not null
            , voteEventTime integer not null
            , tagId integer
            , postId integer not null
            , topNoteId integer
            , criticalThreadId integer
            , o real not null
            , oCount integer not null
            , oSize integer not null
            , p real not null
            , score real not null
            , primary key(tagId, postId)
        ) strict;


    `.execute(db)

	await sql`

        create trigger afterInsertOnScoreEvent after insert on ScoreEvent
        begin
            insert or replace into Score values (
                new.voteEventId
                , new.voteEventTime
                , new.tagId
                , new.postId
                , new.topNoteId
                , new.criticalThreadId
                , new.o 
                , new.oCount 
                , new.oSize 
                , new.p 
                , new.score 
            );
        end;
    `.execute(db)

	await sql`drop table EffectEvent`.execute(db)
	await sql`
        create table if not exists EffectEvent(
            voteEventId         integer not null
            , voteEventTime     integer not null
            , tagId             integer not null
            , postId           integer not null 
            , noteId            integer not null
            , topSubthreadId            integer not null
            , p                 real not null
            , pCount       integer not null
            , pSize       integer not null
            , q                 real not null
            , qCount       integer not null
            , qSize       integer not null
            , r                 real not null
            , primary key(voteEventId, postId, noteId)
        ) strict;
    `.execute(db)

	await sql`drop table Effect`.execute(db)
	await sql`
        create table if not exists Effect(
            voteEventId         integer not null
            , voteEventTime     integer not null
            , tagId             integer not null
            , postId           integer not null 
            , noteId            integer not null
            , topSubthreadId            integer not null
            , p                 real not null
            , pCount       integer not null
            , pSize       integer not null
            , q                 real not null
            , qCount       integer not null
            , qSize       integer not null
            , r                 real not null
            , primary key(tagId, postId, noteId)
        ) strict;
    `.execute(db)

	await sql`
        create trigger afterInsertEffectEvent after insert on EffectEvent begin
            insert or replace into Effect
            values (
                new.voteEventId,
                new.voteEventTime,
                new.tagId,
                new.postId,
                new.noteId,
                new.topSubthreadId,
                new.p,
                new.pCount,
                new.pSize,
                new.q,
                new.qCount,
                new.qSize,
                new.r
            );
        end;

    `.execute(db)

	await sql`drop view FullScore`.execute(db)
	await sql`
        create view FullScore as
        select
              score.voteEventTime
            , score.tagId
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
        left join effect using (tagId, postId)
        where ifnull(noteId = topNoteId, true);
    `.execute(db)
}
