import { prisma } from '#app/utils/db.server.ts';
// import { cleanupDb, createPassword, createUser } from '#tests/db-utils.ts'

// import { z } from 'zod';


// const postIdSchema = z.coerce.number()
// const postId: number = postIdSchema.parse(params.postId)

import { type Post } from '@prisma/client';


export type Tally = {
    readonly upvotes: number,
    readonly total: number,
}

// type InformedTally struct {
//     postID int64
//     noteID int64
//     votes  int64
// }


export type BetaDistribution = {
    readonly average: number;
    readonly weight: number;
} 


function from_alpha_beta(alpha: number, beta: number): BetaDistribution {
    return {
        average: alpha / (alpha + beta),
        weight: alpha + beta,
    }
}

export function update(self: BetaDistribution, tally: Tally): BetaDistribution {
    return {
        average: bayesian_average(self.average, self.weight, tally),
        weight: self.weight + tally.total as number,        
    }
}

function bayesian_average(prior_average: number, weight: number, tally: Tally): number {
    (prior_average * weight + tally.upvotes as number) / (weight + tally.total as number)
}


const WEIGHT_CONSTANT = 2.3

const GLOBAL_PRIOR: BetaDistribution = {
    average: 0.875,
    weight: WEIGHT_CONSTANT,

    // define an update function
}

export async function find_top_note(_tag: string, post_id: number): Promise<Post | null> {
    // const note: Post | null = await prisma.queryRaw("select * from post")

    const note: Post | null = await prisma.$queryRaw<readonly [Post]>`
        WITH children AS
        (
            SELECT
              post_id
            , note_id
            , votes_given_shown_this_note
            , upvotes_given_shown_this_note
            , votes_given_not_shown_this_note
            , upvotes_given_not_shown_this_note
          FROM current_informed_tally p
          WHERE post_id = ?
            UNION ALL
          SELECT 
              p.post_id
            , p.note_id
            , p.votes_given_not_shown_this_note
            , p.upvotes_given_not_shown_this_note
            , p.votes_given_not_shown_this_note
            , p.upvotes_given_not_shown_this_note
          FROM children c
          INNER JOIN current_informed_tally p ON p.post_id = c.note_id
        )
        SELECT 
            children.*
            , current_tally.votes as votes_for_note 
            , current_tally.upvotes as upvotes_for_note
        FROM children join current_tally on(current_tally.post_id = children.note_id);
    `;



    console.log("NOte", note)
    return note;
} 



// export async function find_top_note(post_id: i64, pool: & SqlitePool): Result<Option<(i64, number, number)>> {
//     // first, get table which has stats for this note, all subnotes, and all subnotes
//     let query = r#"
//         WITH children AS
//         (
//             SELECT
//               post_id
//             , note_id
//             , votes_given_shown_this_note
//             , upvotes_given_shown_this_note
//             , votes_given_not_shown_this_note
//             , upvotes_given_not_shown_this_note
//           FROM current_informed_tally p
//           WHERE post_id = ?
//             UNION ALL
//           SELECT 
//               p.post_id
//             , p.note_id
//             , p.votes_given_not_shown_this_note
//             , p.upvotes_given_not_shown_this_note
//             , p.votes_given_not_shown_this_note
//             , p.upvotes_given_not_shown_this_note
//           FROM children c
//           INNER JOIN current_informed_tally p ON p.post_id = c.note_id
//         )
//     SELECT 
//     children.*
//           , current_tally.votes as votes_for_note 
//         , current_tally.upvotes as upvotes_for_note
//         FROM children join current_tally on(current_tally.post_id = children.note_id);
//     "#;

//     // execute the query and get a vector of InformedTally
//     let tallies: Vec<InformedTally> = sqlx:: query_as::<_, InformedTallyQueryResult > (query)
//         .bind(post_id)
//         .fetch_all(pool)
//         .await ?
//         .iter()
//             .map(| result | result.informed_tally())
//             .collect();

//     let subnote_tallies: HashMap<i64, Vec<& InformedTally>> =
//         tallies.iter().into_group_map_by(| tally | tally.post_id);

//     let t = current_tally(post_id, pool).await ?;

//     let(note_id, p, q) = find_top_note_given_tallies(post_id, t, & subnote_tallies);

//     Ok(if note_id == 0 {
//         None
//     } else {
//         Some((note_id, p, q))
//     })
// }


// const EMPTY_TALLY: Tally = Tally {
//     upvotes: 0,
//     total: 0,
// };


// #[derive(sqlx::FromRow, sqlx::Decode, Debug, Clone)]
// pub struct InformedTallyQueryResult {
//     pub post_id: i64,
//     pub note_id: i64,
//     upvotes_given_shown_this_note: i64,
//     votes_given_shown_this_note: i64,
//     upvotes_given_not_shown_this_note: i64,
//     votes_given_not_shown_this_note: i64,
//     upvotes_for_note: i64,
//     votes_for_note: i64,
// }

// impl InformedTallyQueryResult {
//     function informed_tally(&self): InformedTally {
//         InformedTally {
//             post_id: self.post_id,
//             note_id: self.note_id,
//             given_not_shown_this_note: Tally {
//                 upvotes: self.upvotes_given_not_shown_this_note,
//                 total: self.votes_given_not_shown_this_note,
//             },
//             given_shown_this_note: Tally {
//                 upvotes: self.upvotes_given_shown_this_note,
//                 total: self.votes_given_shown_this_note,
//             },
//             for_note: Tally {
//                 upvotes: self.upvotes_for_note,
//                 total: self.votes_for_note,
//             },
//         }
//     }
// }

// #[derive(sqlx::FromRow, sqlx::Decode, Debug, Clone)]
// pub struct InformedTally {
//     pub post_id: i64,
//     pub note_id: i64,

//     given_not_shown_this_note: Tally,
//     given_shown_this_note: Tally,
//     for_note: Tally,
// }

// pub async function find_top_note(post_id: i64, pool: &SqlitePool): Result<Option<(i64, number, number)>> {
//     // first, get table which has stats for this note, all subnotes, and all subnotes
//     let query = r#"
//         WITH children AS
//         (
//           SELECT
//               post_id
//             , note_id
//             , votes_given_shown_this_note
//             , upvotes_given_shown_this_note
//             , votes_given_not_shown_this_note
//             , upvotes_given_not_shown_this_note
//           FROM current_informed_tally p
//           WHERE post_id = ?
//           UNION ALL
//           SELECT 
//               p.post_id
//             , p.note_id
//             , p.votes_given_not_shown_this_note
//             , p.upvotes_given_not_shown_this_note
//             , p.votes_given_not_shown_this_note
//             , p.upvotes_given_not_shown_this_note
//           FROM children c
//           INNER JOIN current_informed_tally p ON p.post_id = c.note_id
//         )
//         SELECT 
//           children.*
//           , current_tally.votes as votes_for_note 
//           , current_tally.upvotes as upvotes_for_note
//         FROM children join current_tally on (current_tally.post_id = children.note_id);
//     "#;

//     // execute the query and get a vector of InformedTally
//     let tallies: Vec<InformedTally> = sqlx::query_as::<_, InformedTallyQueryResult>(query)
//         .bind(post_id)
//         .fetch_all(pool)
//         .await?
//         .iter()
//         .map(|result| result.informed_tally())
//         .collect();

//     let subnote_tallies: HashMap<i64, Vec<&InformedTally>> =
//         tallies.iter().into_group_map_by(|tally| tally.post_id);

//     let t = current_tally(post_id, pool).await?;

//     let (note_id, p, q) = find_top_note_given_tallies(post_id, t, &subnote_tallies);

//     Ok(if note_id == 0 {
//         None
//     } else {
//         Some((note_id, p, q))
//     })
// }

// /// In the context of this function, we always have two posts in scope: A post along with a
// /// note that is attached to it. Here, we call those "A" and "B" (or "a" and "b" in variable
// /// and function names).
// /// The function recurses through the tree of a conversation started by the post `post_id`,
// /// always looking at post/note combinations.
// function find_top_note_given_tallies(
//     post_id: i64,
//     post_tally: Tally,
//     subnote_tallies: &HashMap<i64, Vec<&InformedTally>>,
// ): (i64, number, number) {
//     let mut p_of_a_given_not_shown_top_note = global_prior().update(post_tally).average;

//     println!(
//         "p_of_a_given_not_shown_top_note for post {} = {}",
//         post_id, p_of_a_given_not_shown_top_note
//     );

//     let mut p_of_a_given_shown_top_note = p_of_a_given_not_shown_top_note;

//     let mut top_note_id: i64 = 0;

//     let tallies = subnote_tallies.get(&post_id);
//     if tallies.is_none() {
//         println!(
//             "top note for post {} is note {} with p={} and q={}",
//             post_id, top_note_id, p_of_a_given_shown_top_note, p_of_a_given_not_shown_top_note
//         );
//         // Bit of a hack. Should just get overall tally
//         return (
//             top_note_id,
//             p_of_a_given_shown_top_note,
//             p_of_a_given_not_shown_top_note,
//         );
//     }

//     for tally in tallies.unwrap().iter() {
//         let (_, p_of_b_given_shown_top_subnote, p_of_b_given_not_shown_top_subnote) =
//             find_top_note_given_tallies(tally.note_id, tally.for_note, &subnote_tallies);
//         let support = p_of_b_given_shown_top_subnote / p_of_b_given_not_shown_top_subnote;

//         let p_of_a_given_not_shown_this_note = global_prior()
//             .update(tally.given_not_shown_this_note)
//             .average;
//         let p_of_a_given_shown_this_note = global_prior()
//             .update(tally.given_not_shown_this_note)
//             .update(tally.given_shown_this_note)
//             .average;
//         let delta = p_of_a_given_shown_this_note - p_of_a_given_not_shown_this_note;

//         let p_of_a_given_shown_this_note_and_top_subnote =
//             p_of_a_given_not_shown_this_note + delta * support;

//         println!("\tFor post {} and note {}, p_of_a_given_shown_this_note={}, p_of_a_given_not_shown_this_note={}, delta={}, support={}", post_id, tally.note_id, p_of_a_given_shown_this_note, p_of_a_given_not_shown_this_note, delta, support);

//         if (p_of_a_given_shown_this_note_and_top_subnote - p_of_a_given_not_shown_this_note).abs()
//             > (p_of_a_given_shown_top_note - p_of_a_given_not_shown_top_note).abs()
//         {
//             p_of_a_given_shown_top_note = p_of_a_given_shown_this_note_and_top_subnote;
//             p_of_a_given_not_shown_top_note = p_of_a_given_not_shown_this_note;
//             top_note_id = tally.note_id;
//         }
//     }

//     println!(
//         "top note for post {} is note {} with p={} and q={}",
//         post_id, top_note_id, p_of_a_given_shown_top_note, p_of_a_given_not_shown_top_note
//     );

//     (
//         top_note_id,
//         p_of_a_given_shown_top_note,
//         p_of_a_given_not_shown_top_note,
//     )
// }

// async function current_tally(post_id: i64, pool: &SqlitePool): Result<Tally> {
//     // first, get table which has stats for this note, all subnotes, and all subnotes
//     let query = r#"
//         select upvotes, votes as total from current_tally where post_id = ? 
//     "#;

//     // execute the query and get a vector of InformedTally
//     let tally: Option<Tally> = sqlx::query_as::<_, Tally>(query)
//         .bind(post_id)
//         .fetch_optional(pool)
//         .await?;

//     Ok(tally.unwrap_or(EMPTY_TALLY))
// }
