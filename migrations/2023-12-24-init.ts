import { type Kysely, sql } from 'kysely'

// https://kysely.dev/docs/migrations
// https://kysely-org.github.io/kysely-apidoc/interfaces/Sql.html

export async function up(db: Kysely<any>): Promise<void> {
	await sql`
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" INT NOT NULL DEFAULT (unixepoch('subsec')*1000)
) STRICT;
`.execute(db)

	await sql`
CREATE TABLE "UserImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "altText" TEXT,
    "contentType" TEXT NOT NULL,
    "blob" BLOB NOT NULL,
    "createdAt" INT NOT NULL DEFAULT (unixepoch('subsec')*1000),
    "updatedAt" INT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "UserImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
) STRICT;
`.execute(db)

	await sql`
CREATE TABLE "Password" (
    "hash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Password_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
) STRICT;
`.execute(db)

	await sql`
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expirationDate" INT NOT NULL,
    "createdAt" INT NOT NULL DEFAULT (unixepoch('subsec')*1000),
    "updatedAt" INT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
) STRICT;
`.execute(db)

	await sql`
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "access" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" INT NOT NULL DEFAULT (unixepoch('subsec')*1000),
    "updatedAt" INT NOT NULL
) STRICT;
`.execute(db)

	await sql`
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" INT NOT NULL DEFAULT (unixepoch('subsec')*1000),
    "updatedAt" INT NOT NULL
) STRICT;
`.execute(db)

	await sql`
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" INT NOT NULL DEFAULT (unixepoch('subsec')*1000),
    "type" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "digits" INTEGER NOT NULL,
    "period" INTEGER NOT NULL,
    "charSet" TEXT NOT NULL,
    "expiresAt" INT
) STRICT;
`.execute(db)

	await sql`
CREATE TABLE "Post" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "parentId" INTEGER,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" INT NOT NULL DEFAULT (unixepoch('subsec')*1000),
    CONSTRAINT "Post_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Post" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
) STRICT;
`.execute(db)

	await sql`
CREATE TABLE "Tag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tag" TEXT NOT NULL
) STRICT;
`.execute(db)

	await sql`
CREATE TABLE "VoteHistory" (
    "rowid" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "tagId" INTEGER NOT NULL,
    "postId" INTEGER NOT NULL,
    "noteId" INTEGER,
    "direction" INTEGER NOT NULL,
    "createdAt" INT NOT NULL DEFAULT (unixepoch('subsec')*1000),
    CONSTRAINT "VoteHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "VoteHistory_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
) STRICT;
`.execute(db)

	await sql`
CREATE TABLE "PostStats" (
    "tagId" INTEGER NOT NULL,
    "postId" INTEGER NOT NULL,
    "attention" REAL NOT NULL,
    "views" INTEGER NOT NULL,
    "replies" INTEGER NOT NULL
) STRICT;
`.execute(db)

	await sql`
CREATE TABLE "LocationStats" (
    "locationType" INTEGER NOT NULL,
    "oneBasedRank" INTEGER NOT NULL,
    "voteShare" REAL NOT NULL,
    "latestSitewideVotes" INTEGER NOT NULL
) STRICT;
`.execute(db)

	await sql`
CREATE TABLE "TagStats" (
    "tagId" INTEGER NOT NULL,
    "views" INTEGER NOT NULL,
    "votesPerView" REAL NOT NULL,
    CONSTRAINT "TagStats_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
) STRICT;
`.execute(db)

	await sql`
CREATE TABLE "ExplorationStats" (
    "rowid" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "votes" INTEGER NOT NULL
) STRICT;
`.execute(db)

	await sql`
CREATE TABLE "_PermissionToRole" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_PermissionToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_PermissionToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE
) STRICT;
`.execute(db)

	await sql`
CREATE TABLE "_RoleToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_RoleToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_RoleToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
) STRICT;
`.execute(db)

	await sql`
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
`.execute(db)

	await sql`
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
`.execute(db)

	await sql`
CREATE UNIQUE INDEX "UserImage_userId_key" ON "UserImage"("userId");
`.execute(db)

	await sql`
CREATE UNIQUE INDEX "Password_userId_key" ON "Password"("userId");
`.execute(db)

	await sql`
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
`.execute(db)

	await sql`
CREATE UNIQUE INDEX "Permission_action_entity_access_key" ON "Permission"("action", "entity", "access");
`.execute(db)

	await sql`
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");
`.execute(db)

	await sql`
CREATE UNIQUE INDEX "Verification_target_type_key" ON "Verification"("target", "type");
`.execute(db)

	await sql`
CREATE UNIQUE INDEX "Tag_tag_key" ON "Tag"("tag");
`.execute(db)

	await sql`
CREATE INDEX "VoteHistory_userId_tagId_postId_idx" ON "VoteHistory"("userId", "tagId", "postId");
`.execute(db)

	await sql`
CREATE UNIQUE INDEX "PostStats_postId_key" ON "PostStats"("postId");
`.execute(db)

	await sql`
CREATE UNIQUE INDEX "LocationStats_locationType_oneBasedRank_key" ON "LocationStats"("locationType", "oneBasedRank");
`.execute(db)

	await sql`
CREATE UNIQUE INDEX "TagStats_tagId_key" ON "TagStats"("tagId");
`.execute(db)

	await sql`
CREATE UNIQUE INDEX "_PermissionToRole_AB_unique" ON "_PermissionToRole"("A", "B");
`.execute(db)

	await sql`
CREATE INDEX "_PermissionToRole_B_index" ON "_PermissionToRole"("B");
`.execute(db)

	await sql`
CREATE UNIQUE INDEX "_RoleToUser_AB_unique" ON "_RoleToUser"("A", "B");
`.execute(db)

	await sql`
CREATE INDEX "_RoleToUser_B_index" ON "_RoleToUser"("B");
`.execute(db)

	await sql`
-- The current (latest) votes for all users on all posts
-- If the user has cleared their vote, no row is returned.
CREATE VIEW currentVote as
with latest as (
    SELECT
       userId 
      , tagId
      , postId

      -- NOTE: direction will be the value of direction pulled from the same row that has max(createdAt)
      -- https://www.sqlite.org/lang_select.html#bareagg
      , direction
      , max(rowid) AS latest
      , createdAt AS createdAt
    FROM voteHistory
    GROUP BY userId, postId, tagId
)
-- The latest vote might be zero, so in that case we don't return a record for this user and post
select *
from latest
where direction != 0;
`.execute(db)

	await sql`
-- currentTally counts the latest votes, regardless of whether they are informed or not.
create view currentTally as
select
    tagId
  , postId
  , sum(
      case direction
        when 1 then 1
        else 0
      end
    ) as count
  , count(*) as total
  -- , sum(case when noteId is null and direction = 1 then 1 else 0 end) as count_given_not_seen_any_note
  -- , sum(case when noteId is null then 1 else 0 end) as totalGivenNotSeenAnyNote
from currentVote
group by tagId, postId;
`.execute(db)

	await sql`
-- Same as currentVote, but only looks at informed votes (votes where a note was shown).
create view currentInformedVote as 
    SELECT
       userId 
      , tagId
      , postId
      , noteId

      -- NOTE: direction will be the value of direction pulled from the same row that has max(createdAt)
      -- https://www.sqlite.org/lang_select.html#bareagg
      , direction
      , max(createdAt) AS createdAt
    FROM voteHistory
    -- where noteId is not null
    GROUP BY 
       userId 
      , tagId
      , postId
      , noteId
;
`.execute(db)

	await sql`
create view currentInformedTally as
  select 
      tagId
    , postId
    , noteId
    , sum(
      case
        when direction = 1 then 1
        else 0
      end
    ) as count
    , count(*) as total
    , min(createdAt) as firstVote 
  from currentInformedVote
  -- The latest vote might be zero, so in that case we don't return a record for this user and post
  where direction != 0
  group by tagId, postId, noteId
;
`.execute(db)

	await sql`
create view detailedTally as
with a as (
  select
    tagId 
    , postId
    , noteId
    , count as countGivenShownThisNote
    , total as totalGivenShownThisNote

    , sum(count) over (partition by tagId, postId order by firstVote) - count as countGivenNotShownThisNote
    , sum(total) over (partition by tagId, postId order by firstVote) - total as totalGivenNotShownThisNote

  from currentInformedTally
  group by tagId, postId, noteId 
)
select * from a where noteId is not null;
`.execute(db)

	await sql`
create view currentInformedTallyOld as
with informedTally as (
  select 
      tagId
    , postId
    , noteId
    , sum(
      case
        when direction = 1 then 1
        else 0
      end
    ) as count
    , count(*) as total
  from currentInformedVote
  -- The latest vote might be zero, so in that case we don't return a record for this user and post
  where direction != 0
  group by tagId, postId, noteId
)
-- Find the first time the user voted on the post while being shown the note
, usersFirstVoteOnPostGivenNote as (
  SELECT 
       userId 
        , tagId
        , postId
        , noteId
        -- , direction
        , min(rowid) firstVoteRowid
  FROM voteHistory
  WHERE noteId is not null
  GROUP BY userId, tagId, postId, noteId
)
-- Now find all informed votes, and identify whether they were before or after usersFirstVoteOnPostGivenNote
, allVotes as (
    select
      informedTally.tagId as p_tagId
      , informedTally.postId as p_postId
      , informedTally.noteId as p_noteId
      , usersFirstVoteOnPostGivenNote.firstVoteRowid
      , voteHistory.rowid
      , voteHistory.*
      , case when 
          (firstVoteRowid is null or voteHistory.rowid < firstVoteRowid)
          -- and direction == 1
        then true
        else null end before_note
    
      , informedTally.count as countGivenShownThisNote
      , informedTally.total as totalGivenShownThisNote
    FROM 
       informedTally
       join voteHistory using (tagId, postId)
    LEFT OUTER JOIN usersFirstVoteOnPostGivenNote on (
           usersFirstVoteOnPostGivenNote.tagId = informedTally.tagId
       and usersFirstVoteOnPostGivenNote.postId = informedTally.postId
       and usersFirstVoteOnPostGivenNote.noteId = informedTally.noteId
       and usersFirstVoteOnPostGivenNote.userId = voteHistory.userId
    )
)
, usersLastVoteOnPostBeforeNote as (
    select
        p_tagId as tagId
        , p_postId as postId
        , p_noteId as noteId
        , userId 
        , direction
        , createdAt
        , countGivenShownThisNote
        , totalGivenShownThisNote
        , max(createdAt)
    from  allVotes
    where
    before_note
    group by p_tagId, p_postId, p_noteId,userId 
)
select
    tagId
  , postId
  , noteId
  , sum(
    case direction
      when 1 then 1
      else 0
    end 
  ) as countGivenNotShownThisNote
  , count(*) as totalGivenNotShownThisNote

  , countGivenShownThisNote
  , totalGivenShownThisNote
from usersLastVoteOnPostBeforeNote
group by tagId, postId, noteId;
`.execute(db)
}
