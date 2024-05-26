import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	// We deactivate foreign keys for this migration to make altering constraints
	// less cumbersome.
	// MAKE SURE THEY ARE ACTIVATED AGAIN LATER!
	await sql`PRAGMA foreign_keys = off`.execute(db)

	await sql`drop view FullScore`.execute(db)

	// Update VoteEvent schema
	// -----------------------

	await sql`alter table VoteEvent rename to VoteEventDeprecated`.execute(db)

	await sql`
		create table 'VoteEvent' (
			  voteEventId INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT
			, userId TEXT NOT NULL
			, tagId INTEGER NOT NULL
			, postId INTEGER NOT NULL
			, noteId INTEGER
			, vote INTEGER NOT NULL
			, voteEventTime INT NOT NULL DEFAULT (unixepoch('subsec')*1000)
			, parentId integer
			-- TODO: add foreign key constraints to post for postId, noteId, and parentId
			--       but NOT tagId (deprecated, will be removed)
			, foreign key(userId) references User(id)
	) strict;
	`.execute(db)

	await sql`
		CREATE INDEX 'voteEvent_userId_tagId_postId_idx'
		ON VoteEvent(userId, 'postId');
	`.execute(db)

	await sql`
		insert into VoteEvent
		select * from VoteEventDeprecated
	`.execute(db)

	await sql`drop table VoteEventDeprecated`.execute(db)

	// Update Vote schema
	// ------------------

	await sql`alter table Vote rename to VoteDeprecated`.execute(db)

	await sql`
		create table 'Vote' (
			userId string,
			postId integer not null,
			vote Integer not null,
			latestVoteEventId integer NOT NULL,
			voteEventTime DATETIME NOT NULL,
			primary key(userId, postId)
		);
	`.execute(db)

	await sql`
		insert into Vote
		select
				userId
			, postId
			, vote
			, latestVoteEventId
			, voteEventTime
		from VoteDeprecated
	`.execute(db)

	await sql`drop table VoteDeprecated`.execute(db)

	// This trigger needs to be recreated since it is dropped when the old
	// VoteEvent table is dropped. It needs to be recreated after the new Vote
	// table is created so that it refers to the new Vote table.
	await sql`
		create trigger afterInsertOnVoteEvent after insert on VoteEvent
			begin
				insert into Vote(userId, postId, vote, latestVoteEventId, voteEventTime) values (
					new.userId,
					new.postId,
					new.vote,
					new.voteEventId,
					new.voteEventTime
				) on conflict(userId, postId) do update set
					vote = new.vote
					, latestVoteEventId = new.voteEventId
					, voteEventTime = new.voteEventTime
				;
			end;
	`.execute(db)

	// Update ScoreEvent schema
	// ------------------------

	await sql`drop trigger afterInsertOnScoreEvent`.execute(db)

	await sql`alter table Score rename to ScoreDeprecated`.execute(db)

	await sql`
		CREATE TABLE Score(
			voteEventId integer not null
			, voteEventTime integer not null
			, postId integer not null
			, topNoteId integer
			, criticalThreadId integer
			, o real not null
			, oCount integer not null
			, oSize integer not null
			, p real not null
			, score real not null
			, primary key(postId)
		) strict;
	`.execute(db)

	await sql`
		insert into Score
		select
				voteEventId
			, voteEventTime
			, postId
			, topNoteId
			, criticalThreadId
			, o
			, oCount
			, oSize
			, p
			, score
		from ScoreDeprecated
	`.execute(db)

	await sql`drop table ScoreDeprecated`.execute(db)

	await sql`
		CREATE TRIGGER afterInsertOnScoreEvent after insert on ScoreEvent
			begin
				insert or replace into Score values (
						new.voteEventId
					, new.voteEventTime
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

	// Update EffectEvent schema
	// -------------------------

	await sql`drop trigger afterInsertEffectEvent`.execute(db)

	await sql`alter table Effect rename to EffectDeprecated`.execute(db)

	await sql`
		CREATE TABLE Effect(
				voteEventId         integer not null
			, voteEventTime     integer not null
			, postId           integer not null
			, noteId            integer not null
			, topSubthreadId            integer
			, p                 real not null
			, pCount       integer not null
			, pSize       integer not null
			, q                 real not null
			, qCount       integer not null
			, qSize       integer not null
			, r                 real not null
			, primary key(postId, noteId)
		) strict;
	`.execute(db)

	await sql`
		insert into Effect
		select
				voteEventId
			, voteEventTime
			, postId
			, noteId
			, topSubthreadId
			, p
			, pCount
			, pSize
			, q
			, qCount
			, qSize
			, r
		from EffectDeprecated
	`.execute(db)

	await sql`drop table EffectDeprecated`.execute(db)

	await sql`
		CREATE TRIGGER afterInsertEffectEvent after insert on EffectEvent begin
			insert or replace into Effect
			values (
				new.voteEventId,
				new.voteEventTime,
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

	// Update view FullScore
	// ---------------------

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
			left join Effect using (postId)
			where ifnull(noteId = topNoteId, true)
	`.execute(db)

	// Update PostStats schema
	// -----------------------

	await sql`alter table PostStats drop column tagId`.execute(db)

	// Finally, drop table Tag
	// -----------------------

	await sql`drop table Tag`.execute(db)

	// Reactivate foreign keys.
	await sql`pragma foreign_keys = on`.execute(db)
}
