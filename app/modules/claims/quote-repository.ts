import { type Transaction } from 'kysely'
import { type DB } from '#app/database/types.ts'
import { type Quote } from './claim-types.ts'

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

export async function getQuotes(
	trx: Transaction<DB>,
	artefactId: number,
): Promise<Quote[]> {
	const result: Quote[] = await trx
		.selectFrom('Quote')
		.where('artefactId', '=', artefactId)
		.selectAll()
		.execute()

	return result.map(row => {
		return {
			id: row.id,
			artefactId: row.artefactId,
			quote: row.quote,
			createdAt: row.createdAt,
		}
	})
}
