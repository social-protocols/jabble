import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await db.transaction().execute(async trx => {
		await sql`
			alter table Claim
			rename to Claim__DEP
		`.execute(trx)

		await sql`
			alter table Poll
			rename to Poll__DEP
		`.execute(trx)

		await sql`
			create table Claim (
				  id         integer not null primary key autoincrement
				, quoteId    integer          references Quote(id) default null
				, claim      text    not null
				, postId     number           references Post(id) default null
				, createdAt  integer not null default (unixepoch('subsec')*1000)
			)
		`.execute(trx)

		await sql`
			insert into Claim (
				id
				, quoteId
				, claim
				, postId
				, createdAt
			)
			select
				id
				, quoteId
				, claim
				, postId
				, createdAt
			from CandidateClaim
		`.execute(trx)

		await sql`
			create table Poll (
				claimId integer not null references Claim(id)
				, postId integer not null references Post(id)
				, pollType text not null
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
				  c.id as claimId
				, pdep.postId as postId
				, pdep.pollType as pollType
			from Poll__DEP pdep
			inner join Claim c
			on pdep.postId = c.postId
			where c.postId is not null
		`.execute(trx)

		await sql`
			drop table Poll__DEP
		`.execute(trx)

		await sql`
			drop table ClaimToArtefact
		`.execute(trx)
		
		await sql`
			drop table CandidateClaim
		`.execute(trx)

		await sql`
			drop table Claim__DEP
		`.execute(trx)
	})
}
