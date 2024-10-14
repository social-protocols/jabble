import { type Transaction } from 'kysely'
import { type DB } from '#app/database/types.ts'
import { type Claim } from './claim-types.ts'

export async function insertClaim(
	trx: Transaction<DB>,
	quoteId: number,
	claim: string,
	postId: number | null,
): Promise<Claim> {
	return await trx
		.insertInto('Claim')
		.values({
			quoteId: quoteId,
			claim: claim,
			postId: postId,
		})
		.returningAll()
		.executeTakeFirstOrThrow()
}

export async function getClaims(
	trx: Transaction<DB>,
	quoteId: number,
): Promise<Claim[]> {
	return await trx
		.selectFrom('Claim')
		.where('quoteId', '=', quoteId)
		.selectAll()
		.execute()
}

export async function getClaim(
	trx: Transaction<DB>,
	claimId: number,
): Promise<Claim> {
	return await trx
		.selectFrom('Claim')
		.where('id', '=', claimId)
		.selectAll()
		.executeTakeFirstOrThrow()
}

export async function updatePostIdOnClaim(
	trx: Transaction<DB>,
	claimId: number,
	postId: number,
): Promise<Claim> {
	return await trx
		.updateTable('Claim')
		.set({ postId: postId })
		.where('id', '=', claimId)
		.returningAll()
		.executeTakeFirstOrThrow()
}
