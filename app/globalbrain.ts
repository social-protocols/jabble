import global_brain from '@socialprotocols/globalbrain-node'
import { type Transaction } from 'kysely'
import { type DB } from './db/kysely-types.ts'
import { type VoteEvent } from './db/types.ts'

const gbDatabasePath = process.env.GB_DATABASE_PATH

export async function sendVoteEvent(
	trx: Transaction<DB>,
	voteEvent: VoteEvent,
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

	return processScoreEvents(trx, result, voteEvent)
}

export async function processScoreEvents(
	trx: Transaction<DB>,
	scoreEventsJsonl: String,
	voteEvent: VoteEvent,
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
				console.log('Inserted score event for post', data['score']['post_id'])
				if (
					data['vote_event_id'] == voteEvent.voteEventId &&
					data['score']['tag_id'] == voteEvent.tagId &&
					data['score']['post_id'] == voteEvent.postId
				) {
					gotExpectedScoreEvent = true
				}
			} else if (data['effect'] !== undefined) {
				console.log(
					'Inserted effect event for note',
					data['effect']['note_id'],
					'on post',
					data['effect']['post_id'],
				)
				await insertEffectEvent(trx, data)
			} else {
				throw new Error('Unknown event type')
			}
		}),
	)

	if (!gotExpectedScoreEvent) {
		console.error(
			`Expected score event not found: ${voteEvent.voteEventId}, ${voteEvent.tagId}, ${voteEvent.postId}`,
		)
	}

	console.log(
		'Successfully processed',
		lines.length,
		'events for vote event',
		voteEvent.voteEventId,
	)
}

async function insertScoreEvent(trx: Transaction<DB>, data: any) {
	const data_flat = {
		voteEventId: data['vote_event_id'],
		voteEventTime: data['vote_event_time'],
		...snakeToCamelCaseObject(data['score']),
	}

	const result = await trx
		.insertInto('ScoreEvent')
		.values(data_flat)
		.onConflict(oc => oc.columns(['voteEventId', 'postId']).doNothing())
		.execute()

	return result
}

async function insertEffectEvent(trx: Transaction<DB>, data: any) {
	const data_flat = {
		voteEventId: data['vote_event_id'],
		voteEventTime: data['vote_event_time'],
		...snakeToCamelCaseObject(data['effect']),
	}

	await trx
		.insertInto('EffectEvent')
		.values(data_flat)
		.onConflict(oc =>
			oc.columns(['voteEventId', 'postId', 'noteId']).doNothing(),
		)
		.execute()
}

function snakeToCamelCase(str: string): string {
	return str.replace(/([-_][a-z])/g, group =>
		group.toUpperCase().replace('-', '').replace('_', ''),
	)
}

function snakeToCamelCaseObject(obj: any): any {
	if (obj instanceof Array) {
		return obj.map(v => snakeToCamelCaseObject(v))
	} else if (obj !== null && obj.constructor === Object) {
		return Object.keys(obj).reduce((result, key) => {
			result[snakeToCamelCase(key)] = snakeToCamelCaseObject(obj[key])
			return result
		}, {} as any)
	}
	return obj
}

function camelToSnakeCase(str: string): string {
	return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}
