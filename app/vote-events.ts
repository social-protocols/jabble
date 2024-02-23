import * as fs from 'fs';
import { env } from "process"
import { type VoteEvent } from "./db/types.ts"
// import { vote } from './vote.ts';


// Grab vote events path environment
const voteEventsPath = env.VOTE_EVENTS_PATH!

const voteEventsFH = fs.openSync(voteEventsPath, "a");

export function writeVoteEvent(voteEvent: VoteEvent) {
	const json = JSON.stringify(voteEvent)
	fs.writeSync(voteEventsFH, json + "\n");
	console.log("Write json to ", voteEventsPath, json)
}