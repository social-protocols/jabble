

-- drop view if exists InformedTallyOldAgain;
-- create view if not exists InformedTallyOldAgain as
with informedTally as (

  select 
      tagId
    , postId
    , noteId
    , sum(
      case
        when vote = 1 then 1
        else 0
      end
    ) as count
    , count(*) as total
  from informedVote
  -- The latest vote might be zero, so in that case we don't return a record for this user and post
  where vote != 0
  and eventType == 1
  group by tagId, postId, noteId






)
-- Find the first time the user voted on the post while being shown the note
, usersFirstVoteOnPostGivenNote as (
  SELECT 
       userId 
        , tagId
        , postId
        , noteId
        -- , vote
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
          -- and vote == 1
        then true
        else null end before_note
    
      , informedTally.count as informedCount
      , informedTally.total as informedTotal
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
        , direction as vote
        , createdAt
        , informedCount
        , informedTotal
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
  , informedCount
  , informedTotal
  , sum(
    case vote
      when 1 then 1
      else 0
    end 
  ) as uninformedCount
  , count(*) as uninformedTotal

from usersLastVoteOnPostBeforeNote
group by tagId, postId, noteId;

-- select * from InformedTallyOldAgain;


-- select * from InformedTallyOldAgain;

-- 	 with a as (
-- 		 select
-- 			 tagId 
-- 			 , postId
-- 			 , noteId

-- 			 , sum(count) over (partition by tagId, postId order by firstVote) - count as countBeforeNoteCheck
-- 			 , sum(total) over (partition by tagId, postId order by firstVote) - total as totalBeforeNoteCheck

-- 			 , sum(countBeforeNote) as countBeforeNote
-- 			 , sum(totalBeforeNote) as totalBeforeNote

-- 			 , count as countGivenShownOrVotedOnNote
-- 			 , total as totalGivenShownOrVotedOnNote

-- 			 , sum(countGivenVotedOnNote) as countGivenVotedOnNote
-- 			 , sum(totalGivenVotedOnNote) as totalGivenVotedOnNote

-- 		 from InformedTally
-- 		 group by tagId, postId, noteId 
-- 	 )
-- 	 select 
-- 			 a.tagId
-- 		 , a.postId
-- 		 , a.noteId
-- 		 , a.countBeforeNoteCheck
-- 		 , a.totalBeforeNoteCheck
-- 		 , a.countBeforeNote -- + a0.countGivenShownOrVotedOnNote as countBeforeNote
-- 		 , a.totalBeforeNote -- + a0.totalGivenShownOrVotedOnNote as totalBeforeNote
-- 		 , a.countGivenShownOrVotedOnNote
-- 		 , a.totalGivenShownOrVotedOnNote
-- 		 , a.countGivenVotedOnNote
-- 		 , a.totalGivenVotedOnNote
-- 	 from a 
-- 	 join a a0 using (tagId, postId)
-- 	 where a.noteId != 0
-- 	 and a0.noteId == 0
-- ;


