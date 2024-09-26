import { type Transaction } from 'kysely'
import { type Claim } from '#app/types/api-types.ts'
import { type DB } from '#app/types/kysely-types.ts'

export async function createClaim(
	trx: Transaction<DB>,
	claim: string,
): Promise<Claim> {
	const createdClaim = await trx
		.insertInto('Claim')
		.values({ claim })
		.returningAll()
		.executeTakeFirstOrThrow()

	return {
		id: createdClaim.id,
		claim: createdClaim.claim,
	}
}
