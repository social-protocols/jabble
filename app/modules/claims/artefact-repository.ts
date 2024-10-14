import { type Transaction } from 'kysely'
import { type DB } from '#app/database/types.ts'
import { type Artefact } from './claim-types.ts'

export async function getOrCreateArtefact(
	trx: Transaction<DB>,
	url: string,
): Promise<Artefact> {
	const existingArtefact: Artefact | undefined = await trx
		.selectFrom('Artefact')
		.where('url', '=', url)
		.selectAll()
		.executeTakeFirst()

	if (existingArtefact !== undefined) {
		return existingArtefact
	}

	const createdArtefact = await trx
		.insertInto('Artefact')
		.values({
			url: url,
		})
		.returningAll()
		.executeTakeFirstOrThrow()

	return {
		id: createdArtefact.id,
		url: createdArtefact.url,
		createdAt: createdArtefact.createdAt,
	}
}

export async function getArtefact(
	trx: Transaction<DB>,
	id: number,
): Promise<Artefact> {
	const result = await trx
		.selectFrom('Artefact')
		.where('id', '=', id)
		.selectAll()
		.executeTakeFirstOrThrow()

	return {
		id: result.id,
		url: result.url,
		createdAt: result.createdAt,
	}
}
