import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await db.transaction().execute(async trx => {
		/*
		 * Create `Artifact` and `Quote` tables
		 */

		await sql`
			create table Artefact (
				  id          integer not null primary key autoincrement
				, url         text    not null unique
				, description text             default null
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

		/*
		 * Preserve `ClaimToArtifact` relation
		 */

		// We use the first submission of an artefact.

		await sql`
			insert into Artefact (
				  url
				, createdAt
			)
			select
				  origin
				, min(createdAt) as createdAt
			from ClaimContext
			where origin is not null
			and origin <> ''
			group by origin
		`.execute(trx)

		await sql`
			create table ClaimToArtefact (
				  claimId    integer not null references Claim(Id)
				, artefactId integer not null references Artefact(id)
				, primary key (claimId, artefactId)
			)
		`.execute(trx)

		await sql`
			insert into ClaimToArtefact (
				  claimId
				, artefactId
			)
			select distinct
				  c2cc.claimid as claimId
				, a.id as artefactId
			from claimcontext cc
			join artefact a
			on a.url = cc.origin
			join claimtoclaimcontext c2cc
			on cc.id = c2cc.contextId
			where origin <> ''
			and origin is not null
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

		await sql`
			create table CandidateClaim (
				  id         integer not null primary key autoincrement
				, artefactId integer not null references Artefact(id)
				, quoteId    integer not null references Quote(id)
				, claim      text    not null
				, claimId    number           references Claim(id) default null
				, createdAt  integer not null default (unixepoch('subsec')*1000)
			)
		`.execute(trx)
	})
}
