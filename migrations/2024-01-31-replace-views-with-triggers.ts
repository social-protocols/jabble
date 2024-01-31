// https://kysely-org.github.io/kysely-apidoc/interfaces/Sql.html
import { type Kysely, sql } from 'kysely'

// https://kysely.dev/docs/migrations
// https://kysely-org.github.io/kysely-apidoc/interfaces/Sql.html



export async function up(db: Kysely<any>): Promise<void> {
	await sql`
		drop view if exists currentVote
	`.execute(db)

	await sql`
		drop view if exists currentTally
	`.execute(db)

	await sql`
		drop view if exists currentInformedVote
	`.execute(db)

	await sql`
		drop view if exists currentInformedTally
	`.execute(db)

	await sql`
		drop view if exists detailedTally
	`.execute(db)


	await sql`
		create table if not exists CurrentVote (
			userId string,
			tagId Integer not null,
			postId integer not null,
			direction Integer not null,
			latest integer NOT NULL,
			createdAt DATETIME NOT NULL,
			primary key(userId, tagId, postId
		)

	`.execute(db)

	await sql`
		create table if not exists CurrentTally (
			tagId Integer not null,
			postId integer not null,
			count Integer not null,
			total Integer not null,
			primary key(tagId, postId)
		 );

	`.execute(db)

	await sql`
		create table if not exists CurrentInformedVote (
			userId string,
			tagId Integer not null,
			postId integer not null,
			noteId integer not null,
			direction Integer not null,
			latest integer NOT NULL,
			createdAt DATETIME NOT NULL,
			primary key(userId, tagId, postId, noteId)
		);
	`.execute(db)

	await sql`
		create table if not exists CurrentInformedTally (
			tagId Integer not null,
			postId integer not null,
			noteId integer not null,
			count Integer not null,
			total Integer not null,
			firstVote DateTime not null,
			primary key(tagId, postId, noteId)
		 );
	`.execute(db)

	await sql`
		create trigger insertCurrentVote after insert on VoteHistory
			begin
			insert into CurrentVote(userId, tagId, postId, direction, latest, createdAt) values (
				new.userId,
				new.tagId,
				new.postId,
				new.direction,
				new.rowid,
				new.createdAt
			) on conflict(userId, tagId, postId) do update set
				direction = new.direction,
				latest = new.rowid,
				createdAt = new.createdAt
			;
			end;
	`.execute(db)

	await sql`
		create trigger insertCurrentTally after insert on CurrentVote
			begin
			insert into CurrentTally(tagId, postId, count, total) values (
				new.tagId,
				new.postId,
				(new.direction == 1),
				new.direction != 0
			) on conflict(tagId, postId) do update 
				set 
					total = total + (new.direction != 0),
					count = count + (new.direction == 1)
			;
			end;
	`.execute(db)

	await sql`
		create trigger updateCurrentTally after update on CurrentVote
			begin
			update CurrentTally
				set 
					total = total + (new.direction != 0) - (old.direction != 0),
					count = count + (new.direction == 1) - (old.direction == 1)
			where
				tagId = new.tagId
				and postId = new.postId
			;
			end;
	`.execute(db)

	await sql`
		create trigger insertCurrentInformedVote after insert on VoteHistory
			-- when new.noteId is not null
			begin
			insert into CurrentInformedVote(userId, tagId, postId, noteId, direction, latest, createdAt) values (
				new.userId,
				new.tagId,
				new.postId,
				ifnull(new.noteId,0),
				new.direction,
				new.rowid,
				new.createdAt
			) on conflict(userId, tagId, postId, noteId) do update set
				direction = new.direction,
				latest = new.rowid,
				createdAt = new.createdAt
			;
			end;
	`.execute(db)

	await sql`
		create trigger insertCurrentInformedTally after insert on CurrentInformedVote
			begin
			insert into CurrentInformedTally(tagId, postId, noteId, count, total, firstVote) values (
				new.tagId,
				new.postId,
				new.noteId,
				(new.direction == 1),
				new.direction != 0,
				new.createdAt
			) on conflict(tagId, postId, noteId) do update 
				set 
					total = total + (new.direction != 0),
					count = count + (new.direction == 1)
			;
			end;
	`.execute(db)

	await sql`
		create trigger updateCurrentInformedTally after update on CurrentInformedVote
			begin
			update CurrentInformedTally
				set 
					total = total + (new.direction != 0) - (old.direction != 0),
					count = count + (new.direction == 1) - (old.direction == 1)
			where
				tagId = new.tagId
				and postId = new.postId
				and noteId = ifnull(new.noteId,0)
			;
			end;
	`.execute(db)

	await sql`
		create view detailedTally as
		with a as (
			select
				tagId 
				, postId
				, noteId
				, count as countGivenShownThisNote
				, total as totalGivenShownThisNote

				, sum(count) over (partition by tagId, postId order by firstVote) - count as countGivenNotShownThisNote
				, sum(total) over (partition by tagId, postId order by firstVote) - total as totalGivenNotShownThisNote

			from currentInformedTally
			group by tagId, postId, noteId 
		)
	`.execute(db)
}
