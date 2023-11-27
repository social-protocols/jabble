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


drop view if exists currentInformedTally;
create view currentInformedTally as
with currentInformedVotes as (
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
    where noteId is not null
    GROUP BY 
       userId 
      , tagId
      , postId
      , noteId
)
, informedTally as (
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
  from currentInformedVotes
  -- The latest vote might be zero, so in that case we don't return a record for this user and post
  where direction != 0
  group by tagId, postId, noteId
),  
firstVotesOnNotes as (
  SELECT 
       userId 
        , tagId
        , postId
        , noteId
        -- , direction
        , min(rowid) firstVoteOnThisNoteRowid
  FROM voteHistory
  WHERE noteId is not null
  GROUP BY userId, tagId, postId, noteId
)
, votesBeforeNote as (
    select
      params.tagId as p_tagId
      , params.postId as p_postId
      , params.noteId as p_noteId
      -- , firstVotesOnNotes.tagId as f_tagId
      -- , firstVotesOnNotes.postId as f_postId
      -- , firstVotesOnNotes.noteId as f_noteId
      , firstVotesOnNotes.firstVoteOnThisNoteRowid
      , voteHistory.rowid
      , voteHistory.*
      , case when 
          (firstVoteOnThisNoteRowid is null or voteHistory.rowid < firstVoteOnThisNoteRowid)
          -- and direction == 1
        then true
        else null end before_note
    
      , params.count as countGivenShownThisNote
      , params.total as totalGivenShownThisNote
    FROM 
       informedTally params
       join voteHistory using (tagId, postId)
    LEFT OUTER JOIN firstVotesOnNotes on (
           firstVotesOnNotes.tagId = params.tagId
       and firstVotesOnNotes.postId = params.postId
       and firstVotesOnNotes.noteId = params.noteId
       and firstVotesOnNotes.userId = voteHistory.userId
    )
)
, lastVotesBeforeNote as (
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
    from  votesBeforeNote
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
from lastVotesBeforeNote
group by tagId, postId, noteId;
