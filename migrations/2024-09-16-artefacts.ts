import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await db.transaction().execute(async trx => {
		/*
		 * Create tables for artefact feature
		 */

		await sql`
			create table Artefact (
				  id          integer not null primary key autoincrement
				, url         text    not null unique
				, createdAt   integer not null default (unixepoch('subsec')*1000)
			)
		`.execute(trx)

		// -- The `Quote` table is for the verbatim quote pasted into Jabble.

		await sql`
			create table Quote (
				  id          integer not null primary key autoincrement
				, artefactId  integer not null references Artefact(id)
				, quote       text    not null
				, createdAt   integer not null default (unixepoch('subsec')*1000)
			)
		`.execute(trx)

		await sql`
			create table ClaimToArtefact (
				  claimId    integer not null references Claim(Id)
				, artefactId integer not null references Artefact(id)
				, primary key (claimId, artefactId)
			)
		`.execute(trx)

		await sql`
			create table CandidateClaim (
				  id         integer not null primary key autoincrement
				, artefactId integer not null references Artefact(id)
				, quoteId    integer not null references Quote(id)
				, claim      text    not null
				, postId     number           references Post(id) default null
				, createdAt  integer not null default (unixepoch('subsec')*1000)
			)
		`.execute(trx)

		await sql`
			create table QuoteFallacy (
				  id          integer not null primary key autoincrement
				, quoteId     integer not null references Quote(id)
				, name        text    not null
				, rationale   text    not null
				, probability real    not null
				, createdAt   integer not null default (unixepoch('subsec')*1000)
			)
		`.execute(trx)

		/*
		 * Remove contextId from `Poll`
		 */

		// -- We need to recreate the table because contextId is in the primary key
		// -- of the `Poll` table.

		await sql`
			alter table Poll
			rename to PollDeprecated__TMP
		`.execute(trx)

		await sql`
			create table Poll (
				  claimId  integer not null references Claim(Id)
				, postId   integer not null references Post(id)
				, pollType text    not null
				, primary key (claimId)
			)
		`.execute(trx)

		await sql`
			insert into Poll (
				  claimId
				, postId
				, pollType
			)
			select
				  claimId
				, postId
				, pollType
			from PollDeprecated__TMP
		`.execute(trx)

		await sql`
			drop table PollDeprecated__TMP
		`.execute(trx)

		/*
		 * Drop deprecated tables
		 */

		await sql`
			drop table ClaimToClaimContext
		`.execute(trx)

		await sql`
			drop table ClaimContext
		`.execute(trx)
	})
}
