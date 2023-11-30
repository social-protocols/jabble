
import { db } from "#app/db.ts";
// import { type Post, type PostStats } from "#app/db/types.ts";
// import bloomFilters from 'bloom-filters';


import assert from 'assert';

import { sql } from 'kysely';

import { LocationType, type Location } from "#app/attention.ts";



/*

logExplorationVote is a key part of to our attention model.

In order to estimate the information rate for a post, we track the cumulative
attention for each post using a method similar to the one described in the
[Quality News Readme](https://github.com/social-protocols/news/blob/master/README.md).

But in this case, since we have both upvotes and downvotes, attention is
expected votes (not upvotes) -- the number of votes we would expect
the *average* post to receive if it had this post's history. To calculate
this, we need to know how many votes to expect per post-view as a function of
the location at which a post was viewed (e.g. what sort of page or mobile
view it is shown on, at what rank).

To calculate this, we need to estimate the expected votes at each location.
But we can't do this simply by counting votes at each location, because there
is a confounding factor: Do posts at top ranks because get more votes because
of the effect on rank (.e.g.users pay more attention to posts at top ranks),
or because the post themselves are more voteable?

Do de-confound, we do a good old fashioned randomized experiment. With a some
probability (e.g. 5-10%), the post at each rank is selected randomly (and not
based on the information-optimization algorithm). Then, when there is a vote
for one of these randomly-selected posts, we record it, counting the number
of votes at each location. Dividing by the total impressions gives us the
expected votes per impression at each location -- or the deltaAttention
(per impression) at each location

The logExplorationVote function below updates this aggregate given a
location.



*/

// This needs to be quite small. We want to use an exponentially weighted moving average to detect the gradual changes in user behavior over time
// But we want the moving average window to be quite big so as to have more accurate data. Especially for locations/ranks where we don't get
// a lot of data. 
const movingAverageAlpha = .9999
const windowSize = 1 / (1 - movingAverageAlpha)

export async function logExplorationVote(location: Location) {

    const result = await db
       .updateTable('ExplorationStats')
       .set(eb => ({
               votes: eb('votes', '+', 1)
               // votes: sql<number>`excluded.votes + 1`  // increment votes by 1
       }))
       .returning('votes')
       .execute();

   const sitewideVotes: number = result[0].votes

	const query = db
		.updateTable('LocationStats')
		.where('locationType', '=', location.locationType as number)
		.where('oneBasedRank', '=', location.oneBasedRank)
		.set(() => ({
			// votes: eb(eb(sitewideVotes, '-', 'sitewideVotes'), '+', 1)
			// votes: sql<number>`excluded.votes + 1`  // increment votes by 1

			// this calculates an exponentially weighted moving average
			// voteShare: sql<number>`voteShare * pow(${movingAverageAlpha}, ${sitewideVotes} - latestSitewideVotes) + (1 - ${movingAverageAlpha})`,

			// this calculates an overage average
			// voteShare: sql<number>`(voteShare * latestSitewideVotes + 1) / ${sitewideVotes}`,

			// this calculates overall average until there are ${windowSize} sitewide votes, then
			// switches to an expontentially weighted moving average.
			voteShare: sql<number>`
				case when ${sitewideVotes} < ${windowSize} then 
					(voteShare * latestSitewideVotes + 1) / ${sitewideVotes}
				else 
					voteShare * pow(${movingAverageAlpha}, ${sitewideVotes} - latestSitewideVotes) + (1 - ${movingAverageAlpha})
				end
				`,
			latestSitewideVotes: sitewideVotes
		}))

	// console.log("Update location stats Query is", query.compile())

	await query.execute();

	// console.log("Logged exploration vote", result)
}



