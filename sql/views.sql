
drop view if exists detailedTally;
create view detailedTally as
with a as (
  select
    tagId 
    , postId
    , case when noteId == 0 then null else noteId end as noteId
    , count as countGivenShownNoteOnly
    , total as totalGivenShownNoteOnly

    , sum(count) over (partition by tagId, postId order by firstVote) - count as countBeforeNote
    , sum(total) over (partition by tagId, postId order by firstVote) - total as totalBeforeNote

  from InformedTally
  group by tagId, postId, noteId 
)
select * from a where noteId is not null;
