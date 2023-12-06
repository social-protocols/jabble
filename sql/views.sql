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

-- Same as currentVote, but only looks at informed votes (votes where a note was shown).
drop view if exists currentInformedVote;
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

drop view if exists currentInformedTally;
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


drop view if exists detailedTally;
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

drop view if exists currentInformedTallyOld;
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
