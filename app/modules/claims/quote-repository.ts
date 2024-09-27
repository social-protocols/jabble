import { type Transaction } from 'kysely'
import { type Quote } from '#app/types/api-types.ts'
import { type DB } from '#app/types/kysely-types.ts'

export async function insertQuote(
	trx: Transaction<DB>,
	artefactId: number,
	quote: string,
): Promise<Quote> {
	return await trx
		.insertInto('Quote')
		.values({
			artefactId: artefactId,
			quote: quote,
		})
		.returningAll()
		.executeTakeFirstOrThrow()
}

export async function getOrCreateQuote(
	trx: Transaction<DB>,
	artefactId: number,
	quote: string,
): Promise<Quote> {
	const existingQuote: Quote | undefined = await trx
		.selectFrom('Quote')
		.where('quote', '=', quote)
		.where('artefactId', '=', artefactId)
		.selectAll()
		.executeTakeFirst()

	if (existingQuote !== undefined) {
		return existingQuote
	}

	return await trx
		.insertInto('Quote')
		.values({
			artefactId: artefactId,
			quote: quote,
		})
		.returningAll()
		.executeTakeFirstOrThrow()
}

export async function getQuote(
	trx: Transaction<DB>,
	id: number,
): Promise<Quote> {
	const result = await trx
		.selectFrom('Quote')
		.where('id', '=', id)
		.selectAll()
		.executeTakeFirstOrThrow()

	return {
		id: result.id,
		artefactId: result.artefactId,
		quote: result.quote,
		createdAt: result.createdAt,
	}
}
