import global_brain from '@socialprotocols/globalbrain-node'
import { type Transaction } from 'kysely'
import { type DBVoteEvent } from '#app/types/db-types.ts'
import { type DB } from '#app/types/kysely-types.ts'
import { insertEffectEvent } from './effect-repository.ts'
import { insertScoreEvent } from './score-repository.ts'
import { camelToSnakeCase } from './scoring-utils.ts'

const gbDatabasePath = process.env.GB_DATABASE_PATH

export async function sendVoteEvent(
	trx: Transaction<DB>,
	voteEvent: DBVoteEvent,
) {
	const json = JSON.stringify(voteEvent, (_key, value) => {
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			const replacement: any = {}
			for (const k in value) {
				if (Object.hasOwnProperty.call(value, k)) {
					replacement[camelToSnakeCase(k)] = value[k]
				}
			}
			return replacement
		}
		return value
	})

	const result = await global_brain.process_vote_event_json(
		gbDatabasePath,
		json,
	)

	await processScoreEvents(trx, result, voteEvent)
}

export async function processScoreEvents(
	trx: Transaction<DB>,
	scoreEventsJsonl: String,
	voteEvent: DBVoteEvent,
) {
	const lines = scoreEventsJsonl.split('\n').filter(line => line !== '')

	let gotExpectedScoreEvent = false

	await Promise.all(
		lines.map(async (line: string) => {
			let data: any = {}

			try {
				data = JSON.parse(line)
			} catch (error) {
				console.log(`Error parsing JSON line ${line}: ${error}`)
			}

			if (data['score'] !== undefined) {
				await insertScoreEvent(trx, data)
				if (
					data['vote_event_id'] == voteEvent.voteEventId &&
					data['score']['post_id'] == voteEvent.postId
				) {
					gotExpectedScoreEvent = true
				}
			} else if (data['effect'] !== undefined) {
				await insertEffectEvent(trx, data)
			} else {
				throw new Error('Unknown event type')
			}
		}),
	)

	if (!gotExpectedScoreEvent) {
		console.error(
			`Expected score event not found: ${voteEvent.voteEventId}, ${voteEvent.postId}`,
		)
	}

	console.log(
		'Successfully processed',
		lines.length,
		'score/effect events for vote event',
		voteEvent.voteEventId,
	)
}
