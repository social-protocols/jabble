import * as fs from 'fs';
import { env } from "process"
import { type VoteEvent } from "./db/types.ts"
import { db } from "./db.ts"
import { json } from 'express';

// Grab vote events path environment
const voteEventsPath = env.VOTE_EVENTS_PATH!

if (!voteEventsPath) {
  throw new Error("VOTE_EVENTS_PATH must be set")
}

const voteEventsFH = fs.openSync(voteEventsPath, "a");

let voteEventsFD: number = 0


function camelToSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

export async function writeVoteEvent(voteEvent: VoteEvent) {

	if (voteEventsFD == 0) {
		await initVoteEventStream()
	}

	// The global brain service uses snake_case field names.
	const json = JSON.stringify(voteEvent, (key, value) => {
	  if (value && typeof value === 'object' && !Array.isArray(value)) {
	    const replacement: any = {};
	    for (const k in value) {
	      if (Object.hasOwnProperty.call(value, k)) {
	        replacement[camelToSnakeCase(k)] = value[k];
	      }
	    }
	    return replacement;
	  }
	  return value;
	});


	fs.writeSync(voteEventsFD, json + "\n");
}

export async function initVoteEventStream() {
	voteEventsFD = fs.openSync(voteEventsPath, "w");

	const voteEvents = await db.selectFrom("VoteEvent").selectAll().execute()

	// write all vote events to file
	voteEvents.forEach(async (voteEvent) => {
		writeVoteEvent(voteEvent)
	})

	console.log("Wrote all vote events to ", voteEventsPath)

}
