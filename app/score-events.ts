import { spawn } from 'child_process';
import { env } from "process";
import { type InsertableScore } from './db/types.ts';
import { db } from "./db.ts";

const scoreEventsPath = env.SCORE_EVENTS_PATH!

export async function processScoreEvents() {
  console.log("Processing score events")

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
		    const data: InsertableScore = JSON.parse(line) as InsertableScore;
		    // await db.insertInto('yourTableName').values(data).execute();

		    const result = await db
		      .insertInto('ScoreEvent')
		      .values(data)
		      .onConflict((oc) => oc.columns(['voteEventId','postId']).doNothing())
		      .execute()

		    console.log("Result of inserting score data ", result)

		  } catch (error) {
		    console.error('Error parsing JSON or writing to DB:', error);
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
