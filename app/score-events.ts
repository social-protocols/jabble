import { spawn } from 'child_process';
import { env } from "process";
import { type InsertableScore } from './db/types.ts';
import { db } from "./db.ts";
import { type Score } from "./db/types.ts";

const scoreEventsPath = env.SCORE_EVENTS_PATH!

function snakeToCamelCase(str: string): string {
  return str.replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace('-', '').replace('_', ''));
}

function snakeToCamelCaseObject(obj: any): any {
  if (obj instanceof Array) {
    return obj.map((v) => snakeToCamelCaseObject(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      result[snakeToCamelCase(key)] = snakeToCamelCaseObject(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

type EventInput = {
	vote_event_id: number
	vote_event_time: number
}

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
      .onConflict((oc) => oc.columns(['voteEventId','postId']).doNothing())
      .execute()

    console.log("Result of inserting score event ", result)
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
      .onConflict((oc) => oc.columns(['voteEventId', 'postId', 'noteId']).doNothing())
      .execute()

    console.log("Result of inserting effect event ", result)
}

export async function processScoreEvents() {
  console.log("Processing event input")

  const tail = spawn('tail', ['-F', '-n', '+0', scoreEventsPath]);

  let buffer = '';

  tail.stdout.on('data', (data) => {
	  buffer += data.toString();
	  let lines = buffer.split('\n');
	  buffer = lines.pop() || ''; // Keep the incomplete line in the buffer
	  lines.forEach(async (line: string) => {
		  try {

		    if (line === "") {
		      return
		    }

		    const data: any = JSON.parse(line);

		    if (data['score'] !== undefined) {
		    	insertScoreEvent(data)
			  } else if (data['effect'] !== undefined) {
		    	insertEffectEvent(data)
			  } else {
			  	throw new Error("Unknown event type")
			  }

		  } catch (error) {
		    console.error('Error writing score JSON or writing to DB:', error);
		    tail.kill('SIGTERM')
		  }
		});
	});

  tail.stderr.on('data', (data) => {
      console.error(`stderr from tail: ${data}`);
  });

  tail.on('close', (code) => {
      console.log(`tail child process exited with code ${code}`);
  });

  return tail

}
