import { createReadStream, watch } from "fs";
import { env } from "process";
import { createInterface } from "readline";
import { type ScoreData } from '#app/db/types.ts'
import { db } from "./db.ts";
import { spawn } from 'child_process';

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
		    console.log("Got score data line: ",line, line.length)

		    if (line === "") {
		      return
		    }
		    const data: ScoreData = JSON.parse(line) as ScoreData;
		    // await db.insertInto('yourTableName').values(data).execute();

		    const result = await db
		      .insertInto('ScoreData')
		      .values(data)
		      .onConflict((oc) => oc.columns(['postId', 'tagId']).doUpdateSet({ ...data }))
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

}
