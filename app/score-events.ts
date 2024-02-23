import { createReadStream, watch } from "fs";
import { env } from "process";
import { createInterface } from "readline";
import { type ScoreData } from '#app/db/types.ts'
import { db } from "./db.ts";

const scoreEventsPath = env.SCORE_EVENTS_PATH!
export async function processScoreEvents() {
	console.log("Processing score events")

	// sleep 5 seconds
	await new Promise(resolve => setTimeout(resolve, 5000))

	let lastReadSize = 0;

	function readNewData() {
	  const stream = createReadStream(scoreEventsPath, {
	    start: lastReadSize,
	    encoding: 'utf-8',
	  });
	  const rl = createInterface({ input: stream });

	  rl.on('line', async (line) => {
	    try {
	    	console.log("Got score data json: ",line)
	      const data: ScoreData = JSON.parse(line) as ScoreData;
	      // await db.insertInto('yourTableName').values(data).execute();

				const result = await db
					.insertInto('ScoreData')
					.values(data)
					.onConflict((oc) => oc.columns(['postId', 'tagId']).doUpdateSet({ ...data }))
					.execute()

				console.log("Inserted score data", result)

	    } catch (error) {
	      console.error('Error parsing JSON or writing to DB:', error);
	    }
	  });

	  stream.on('end', () => {
	    lastReadSize = stream.bytesRead;
	  });
	}

	console.log("Reading new data from ", scoreEventsPath)
	readNewData()

	return watch(scoreEventsPath, (eventType, fn) => {
    if (eventType === 'change') {
    	console.log("Got change event: ", fn)
      readNewData();
    }
  });

}
