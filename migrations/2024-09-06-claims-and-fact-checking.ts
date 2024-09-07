import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await db.transaction().execute(async trx => {
		await sql`
			create table Claim (
				id integer not null primary key autoincrement
				, claim text not null
			)
		`.execute(trx)

		await sql`
			create table ClaimContext (
				id integer not null primary key autoincrement
				, context text not null
				, origin text
				, createdAt integer not null default (unixepoch('subsec')*1000)
			)
		`.execute(trx)

		await sql`
			create table ClaimToClaimContext (
				claimId integer not null references Claim(Id)
				, contextId integer not null references ClaimContext(id)
				, primary key (claimId, contextId)
			)
		`.execute(trx)

		await sql`
			create table FactCheck (
				claimId integer not null references Claim(Id)
				, contextId integer not null references ClaimContext(id)
				, postId integer not null references Post(id)
				, primary key (claimId, contextId)
			)
		`.execute(trx)
	})
}
