import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {

	db.transaction().execute(async (trx) => {

		// We deactivate foreign keys for this migration to make altering constraints
		// less cumbersome.
		await sql`PRAGMA foreign_keys = off`.execute(trx)

		await sql`drop view FullScore`.execute(trx)

		// Update VoteEvent schema
		// -----------------------

		await sql`alter table VoteEvent rename to VoteEventDeprecated`.execute(trx)

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
		`.execute(trx)

		await sql`
			CREATE INDEX 'voteEvent_userId_tagId_postId_idx'
			ON VoteEvent(userId, 'postId');
		`.execute(trx)

		await sql`
			insert into VoteEvent
			select * from VoteEventDeprecated
		`.execute(trx)

		await sql`drop table VoteEventDeprecated`.execute(trx)

		// Update Vote schema
		// ------------------

		await sql`alter table Vote rename to VoteDeprecated`.execute(trx)

		// Prior to moving all the votes in the new Vote table, we need to delete
		// duplicates that happened when reposting a post under a different tag.
		// As we are removing tags here, these will violate the unique constraints
		// on the new Vote table.
		await sql`
			with posts_with_tag_counts as (
				select
					postId
					, count(distinct tagId) as count
				from VoteDeprecated
				group by postId
			)
			, duplicates as (
				select *
				from posts_with_tag_counts
				where count > 1
			)
			, duplicates_with_votes as (
				select *
				from duplicates
				left outer join VoteDeprecated
				on VoteDeprecated.postId = duplicates.postId
				order by VoteDeprecated.postId
			)
			, original_posts_from_duplicates as (
				select
					postId
					, min(voteEventTime) as minVoteEventTime
				from duplicates_with_votes
				group by postId
			)
			, votes_to_delete as (
				select
					d.postId
					, d.userId
					, d.voteEventTime
				from duplicates_with_votes d
				left join original_posts_from_duplicates o
				on d.postId = o.postId
				and d.voteEventTime = o.minVoteEventTime
				where o.postId is null
			)
			delete from VoteDeprecated
			where exists (
				select 1
				from votes_to_delete
				where VoteDeprecated.postId = votes_to_delete.postId
				and VoteDeprecated.userId = votes_to_delete.userId
				and VoteDeprecated.voteEventTime = votes_to_delete.voteEventTime
			)
		`.execute(trx)

		await sql`
			create table 'Vote' (
				userId string,
				postId integer not null,
				vote Integer not null,
				latestVoteEventId integer NOT NULL,
				voteEventTime DATETIME NOT NULL,
				primary key(userId, postId)
			);
		`.execute(trx)

		await sql`
			insert into Vote
			select
					userId
				, postId
				, vote
				, latestVoteEventId
				, voteEventTime
			from VoteDeprecated
		`.execute(trx)

		await sql`drop table VoteDeprecated`.execute(trx)

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
		`.execute(trx)

		// Update ScoreEvent schema
		// ------------------------

		await sql`drop trigger afterInsertOnScoreEvent`.execute(trx)

		await sql`drop table Score`.execute(trx)

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
		`.execute(trx)

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
		`.execute(trx)

		// Update EffectEvent schema
		// -------------------------

		await sql`drop trigger afterInsertEffectEvent`.execute(trx)

		await sql`drop table Effect`.execute(trx)

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
		`.execute(trx)

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
		`.execute(trx)

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
		`.execute(trx)

		// Update PostStats schema
		// -----------------------

		await sql`alter table PostStats drop column tagId`.execute(trx)

		// Finally, drop table Tag
		// -----------------------

		await sql`drop table Tag`.execute(trx)

		// Clear EffectEvent and ScoreEvent tables
		// ---------------------------------------

		await sql`delete from EffectEvent`.execute(trx)
		
		await sql`delete from ScoreEvent`.execute(trx)

		// Reactivate foreign keys.
		await sql`pragma foreign_keys = on`.execute(trx)

	})
}
