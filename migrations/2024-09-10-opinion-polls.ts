import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await db.transaction().execute(async trx => {
		await sql`
			alter table FactCheck
			add column pollType text not null default 'factCheck'
		`.execute(trx)

		await sql`
			create table Poll (
				claimId integer not null references Claim(Id)
				, contextId integer not null references ClaimContext(id)
				, postId integer not null references Post(id)
				, pollType text not null
				, primary key (claimId, contextId)
			)
		`.execute(trx)

		await sql`
			insert into Poll
			select * from FactCheck
		`.execute(trx)

		await sql`drop table FactCheck`.execute(trx)
	})
}
