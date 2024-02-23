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
        alter table Vote add column updatedAt integer
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
            insert into Vote(userId, tagId, postId, vote, latestVoteEventId, createdAt, updatedAt) values (
                new.userId,
                new.tagId,
                new.postId,
                new.vote,
                new.voteEventId,
                new.createdAt,
                new.createdAt
            ) on conflict(userId, tagId, postId) do update set
                vote = new.vote
                , latestVoteEventId = new.voteEventId
                , updatedAt = new.createdAt
            ;
        end;
    `.execute(db)

    await sql`
        create table if not exists ScoreData(
            tagId               integer
            , parentId          integer
            , postId            integer not null
            , topNoteId         integer
            , parentP           real
            , parentQ           real
            , p                 real not null
            , q                 real not null
            , count             integer not null
            , sampleSize       integer not null
            , updatedAt integer not null default (unixepoch('subsec')*1000)
            , primary key(tagId, postId)
        ) strict;
    `.execute(db)

}