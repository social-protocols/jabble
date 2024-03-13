import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {

    await sql`
        alter table CurrentVote rename to Vote
    `.execute(db)


    await sql`
        alter table Vote rename column direction to vote
    `.execute(db)

    await sql`
        alter table Vote rename column latest to latestVoteEventId
    `.execute(db)

    await sql`
        alter table Vote rename column createdAt to voteEventTime
    `.execute(db)

    await sql`
        drop view currentInformedTallyOld;
    `.execute(db)

   await sql`
        drop view detailedTally;
    `.execute(db)

    await sql`
        alter table VoteHistory rename to VoteEvent
    `.execute(db)

    await sql`
        alter table VoteEvent rename column direction to vote
    `.execute(db)

    await sql`
        alter table VoteEvent rename column rowid to voteEventId
    `.execute(db)

    await sql`
        alter table VoteEvent rename column createdAt to voteEventTime
    `.execute(db)

    await sql`
        alter table VoteEvent add column parentId integer
    `.execute(db)


    await sql`
        drop trigger insertCurrentTally;
    `.execute(db)

    await sql`
        drop trigger updateCurrentTally;
    `.execute(db)

    await sql`
        drop trigger insertCurrentInformedTally;
    `.execute(db)

    await sql`
        drop trigger updateCurrentInformedTally;
    `.execute(db)

    await sql`
        drop trigger insertCurrentInformedVote
    `.execute(db)


    await sql`
        drop trigger insertCurrentVote
    `.execute(db)


    await sql`
        drop table CurrentTally
    `.execute(db)

    await sql`
        drop table CurrentInformedTally
    `.execute(db)

    await sql`
        drop table CurrentInformedVote

    `.execute(db)


    await sql`
        create trigger afterInsertOnVoteEvent after insert on VoteEvent
        begin
            -- Insert/update the vote record
            insert into Vote(userId, tagId, postId, vote, latestVoteEventId, voteEventTime) values (
                new.userId,
                new.tagId,
                new.postId,
                new.vote,
                new.voteEventId,
                new.voteEventTime
            ) on conflict(userId, tagId, postId) do update set
                vote = new.vote
                , latestVoteEventId = new.voteEventId
                , voteEventTime = new.voteEventTime
            ;
        end;
    `.execute(db)


    await sql`
        create table ScoreEvent (
            voteEventId integer not null
            , voteEventTime integer not null
            , tagId integer
            , postId integer not null
            , topNoteId integer
            , o real not null
            , oCount integer not null
            , oSize integer not null
            , p real not null
            , score real not null
            , primary key(voteEventId, postId)
        ) strict;
    `.execute(db)

    await sql`

        create table Score(
            voteEventId integer not null
            , voteEventTime integer not null
            , tagId integer
            , postId integer not null
            , topNoteId integer
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
                , new.o 
                , new.oCount 
                , new.oSize 
                , new.p 
                , new.score 
            );
        end;
    `.execute(db)



    await sql`
        create table if not exists EffectEvent(
            voteEventId         integer not null
            , voteEventTime     integer not null
            , tagId             integer not null
            , postId           integer not null 
            , noteId            integer not null
            , p                 real not null
            , pCount       integer not null
            , pSize       integer not null
            , q                 real not null
            , qCount       integer not null
            , qSize       integer not null
            , primary key(voteEventId, postId, noteId)
        ) strict;
    `.execute(db)

    await sql`
        create table if not exists Effect(
            voteEventId         integer not null
            , voteEventTime     integer not null
            , tagId             integer not null
            , postId           integer not null 
            , noteId            integer not null
            , p                 real not null
            , pCount       integer not null
            , pSize       integer not null
            , q                 real not null
            , qCount       integer not null
            , qSize       integer not null
            , primary key(tagId, postId, noteId)
        ) strict;
    `.execute(db)

    await sql`

        create trigger afterInsertEffectEvent after insert on EffectEvent begin
            insert or replace into Effect(
                voteEventId,
                voteEventTime,
                tagId,
                postId,
                noteId,
                p,
                pCount,
                pSize,
                q,
                qCount,
                qSize
            ) values (
                new.voteEventId,
                new.voteEventTime,
                new.tagId,
                new.postId,
                new.noteId,
                new.p,
                new.pCount,
                new.pSize,
                new.q,
                new.qCount,
                new.qSize
            ) on conflict(tagId, postId, noteId) do update set
                voteEventId = new.voteEventId,
                voteEventTime = new.voteEventTime,
                p = new.p,
                pCount = new.pCount,
                pSize = new.pSize,
                q = new.q,
                qCount = new.qCount,
                qSize = new.qSize
            ;
        end;

    `.execute(db)


    await sql`
        create view FullScore as
        select
            Effect.*
            , o
            , oCount
            , oSize
            , score
        from Score
        left join effect using (tagId, postId)
        where noteId = topNoteId; 
    `.execute(db)



}
