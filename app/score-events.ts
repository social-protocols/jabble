import { spawn } from 'child_process'
import EventEmitter from 'events'
import { env } from 'process'
// import { type InsertableScore , type Score } from './db/types.ts';
import { type VoteEvent } from './db/types.ts'
import { db } from './db.ts'

const scoreEventsPath = env.SCORE_EVENTS_PATH!

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

// type EventInput = {
// 	vote_event_id: number
// 	vote_event_time: number
// }

// type ScoreEventInput = Event & {score: Score}
// type EventInput = ScoreEventInput
// type ScoreEventInput = Event & {score: EventInput}

async function insertScoreEvent(data: any) {
	const data_flat = {
		voteEventId: data['vote_event_id'],
		voteEventTime: data['vote_event_time'],
		...snakeToCamelCaseObject(data['score']),
	}

	const result = await db
		.insertInto('ScoreEvent')
		.values(data_flat)
		.onConflict(oc => oc.columns(['voteEventId', 'postId']).doNothing())
		.execute()
}

async function insertEffectEvent(data: any) {
	const data_flat = {
		voteEventId: data['vote_event_id'],
		voteEventTime: data['vote_event_time'],
		...snakeToCamelCaseObject(data['effect']),
	}

	const result = await db
		.insertInto('EffectEvent')
		.values(data_flat)
		.onConflict(oc =>
			oc.columns(['voteEventId', 'postId', 'noteId']).doNothing(),
		)
		.execute()

	// console.log("Result of inserting effect event ", result)
}

class ScoreEventEmitter extends EventEmitter {}
export const scoreEventEmitter = new ScoreEventEmitter()

export async function processScoreEvents() {
	console.log('Processing event input')

	const tail = spawn('tail', ['-F', '-n', '+0', scoreEventsPath])

	let buffer = ''

	tail.stdout.on('data', data => {
		buffer += data.toString()
		let lines = buffer.split('\n')
		buffer = lines.pop() || '' // Keep the incomplete line in the buffer
		lines.forEach(async (line: string) => {
			try {
				if (line === '') {
					return
				}

				const data: any = JSON.parse(line)

				if (data['score'] !== undefined) {
					insertScoreEvent(data)

					console.log('Got event here', data)
					const idStr = scoreEventIdStr({
						voteEventId: data['vote_event_id'],
						tagId: data['score']['tag_id'],
						postId: data['score']['post_id'],
					})
					console.log('emit score event', data, idStr)
					scoreEventEmitter.emit(idStr, data)
				} else if (data['effect'] !== undefined) {
					insertEffectEvent(data)
				} else {
					throw new Error('Unknown event type')
				}
			} catch (error) {
				console.error('Error writing score JSON or writing to DB:', error)
				tail.kill('SIGTERM')
			}
		})
	})

	tail.stderr.on('data', data => {
		console.error(`stderr from tail: ${data}`)
	})

	tail.on('close', code => {
		console.log(`tail child process exited with code ${code}`)
	})

	return tail
}

function scoreEventIdStr(event: {
	voteEventId: Number
	tagId: Number
	postId: Number
}) {
	return `${event.voteEventId}-${event.tagId}-${event.postId}`
}

// Wait until a score event for the vote on this post has been written to the database.
export function waitForScoreEvent(voteEvent: VoteEvent): Promise<void> {
	const idStr = scoreEventIdStr(voteEvent)

	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			scoreEventEmitter.removeListener(idStr, listener)
			reject(new Error('Timeout waiting for score event: ' + idStr))
		}, 10000) // Timeout after 10 seconds, for example

		const listener = (scoreEvent: any) => {
			console.log('Have score event with id', scoreEventIdStr)
			if (scoreEventIdStr(scoreEvent) === idStr) {
				clearTimeout(timeout)
				scoreEventEmitter.removeListener(idStr, listener)
				console.log('Resolving')
				resolve()
			}
		}

		scoreEventEmitter.on(idStr, listener)
	})
}
