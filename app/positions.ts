import { db } from './db.ts'
import { getOrInsertTagId } from './tag.ts'
import { type Direction } from './vote.ts'
// import { type PostId } from "./post.ts";

export type Position = {
  postId: number
  vote: Direction
}

export async function getUserPositions(
  userId: string,
  tag: string,
  postIds: number[],
): Promise<Position[]> {
  let tagId = await getOrInsertTagId(tag)

  return await db
    .selectFrom('Vote')
    .innerJoin('Post', 'postId', 'Post.id')
    .where('userId', '=', userId)
    .where('tagId', '=', tagId)
    .where(eb =>
      eb.or([eb('parentId', 'in', postIds), eb('id', 'in', postIds)]),
    )
    .select(['postId', 'vote'])
    .execute()
}

// pub async fn positions(

//     cookies: Cookies,

//     Extension(pool): Extension<SqlitePool>,

//     Form(form_data): Form<PositionsRequest>,

// ) -> Result<Markup, AppError> {

//     let user = get_or_create_user(&cookies, &pool).await?;

//     let user_id = user.id;

//     let tag = form_data.tag.as_str();

//     let positions: Vec<(i64, i64)> = if form_data.post_id == 0 {

//         get_positions_for_tag(tag, user_id, &pool).await?

//     } else {

//         get_positions_for_post(form_data.post_id, user_id, &pool).await?

//     };

//     let json = serde_json::to_string(&positions)?;

//     Ok(html! {

//         script language="javascript" {

//             "var userID = " (user_id) ";"

//             "var positions = " (PreEscaped(json)) ";"

//             "setPositions(userID, positions);"

//         }

//     })

// }
//
//
//
// pub async fn get_positions_for_tag(

//     tag: &str,

//     user_id: i64,

//     pool: &SqlitePool,

// ) -> Result<Vec<(i64, i64)>> {

//     let query = r#"

//         select

//             post_id, direction

//         from

//             current_vote

//             join posts on (post_id = posts.id)

//             join tags on (tag_id = tags.id)

//         where

//             user_id = ?

//             and tag = ?

//             and posts.parent_id is null

//     "#;

//     // execute the query and get a vector of Votes

//     let positions: Vec<(i64, i64)> = sqlx::query_as::<_, (i64, i64)>(query)

//         .bind(user_id)

//         .bind(tag)

//         .fetch_all(pool)

//         .await?;

//     Ok(positions)

// }
