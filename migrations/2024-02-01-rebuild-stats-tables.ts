// https://kysely-org.github.io/kysely-apidoc/interfaces/Sql.html
import { type Kysely, sql } from 'kysely'

// https://kysely.dev/docs/migrations
// https://kysely-org.github.io/kysely-apidoc/interfaces/Sql.html

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    delete from currentVote where 1=1;
  `.execute(db)

  await sql`
    delete from currentTally where 1=1;
  `.execute(db)

  await sql`
    delete from currentInformedVote where 1=1;
  `.execute(db)

  await sql`
    delete from currentInformedTally where 1=1; 
  `.execute(db)

  await sql`
    create table savedRowId as select max(rowId) as maxRowId from voteHistory;
  `.execute(db)

  await sql`
    insert into voteHistory(userId, tagId, postId, noteId, direction, createdAt) select userId, tagId, postId, noteId, direction, createdAt from voteHistory;
  `.execute(db)

  await sql`
    delete from voteHistory where rowId > (select maxRowId from savedRowId);
  `.execute(db)

  await sql`
    drop table savedRowId;
  `.execute(db)
}
