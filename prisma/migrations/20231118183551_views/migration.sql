-- The current (latest) votes for all users on all posts
-- If the user has cleared their vote, no row is returned.
CREATE VIEW current_vote as
with latest as (
    SELECT
        user_id
      , tag_id
      , post_id

      -- NOTE: direction will be the value of direction pulled from the same row that has max(created)
      -- https://www.sqlite.org/lang_select.html#bareagg
      , direction
      , max(created) AS created
    FROM vote_history
    GROUP BY user_id, post_id, tag_id
)
-- The latest vote might be zero, so in that case we don't return a record for this user and post
select *
from latest
where direction != 0;


-- current_tally counts the latest votes, regardless of whether they are informed or not.
create view current_tally as
select
    tag_id
  , post_id
  , sum(
      case direction
        when 1 then 1
        else 0
      end
    ) as upvotes
  , count(*) as votes
  -- , sum(case when note_id is null and direction = 1 then 1 else 0 end) as upvotes_given_not_seen_any_note
  -- , sum(case when note_id is null then 1 else 0 end) as votes_given_not_seen_any_note
from current_vote
group by tag_id, post_id;



drop view if exists current_informed_tally;
create view current_informed_tally as
with current_informed_votes as (
    SELECT
        user_id
      , tag_id
      , post_id
      , note_id

      -- NOTE: direction will be the value of direction pulled from the same row that has max(created)
      -- https://www.sqlite.org/lang_select.html#bareagg
      , direction
      , max(created) AS created
    FROM vote_history
    where note_id is not null
    GROUP BY 
        user_id
      , tag_id
      , post_id
      , note_id
)
, informed_tally as (
  select 
      tag_id
    , post_id
    , note_id
    , sum(
      case
        when direction = 1 then 1
        else 0
      end
    ) as upvotes
    , count(*) as votes
  from current_informed_votes
  -- The latest vote might be zero, so in that case we don't return a record for this user and post
  where direction != 0
  group by tag_id, post_id, note_id
),  
first_votes_on_notes as (
  SELECT 
        user_id
        , tag_id
        , post_id
        , note_id
        -- , direction
        , min(rowid) first_vote_on_this_note_rowid
  FROM vote_history
  WHERE note_id is not null
  GROUP BY user_id, tag_id, post_id, note_id
)
, votes_before_note as (
    select
      params.tag_id as p_tag_id
      , params.post_id as p_post_id
      , params.note_id as p_note_id
      -- , first_votes_on_notes.tag_id as f_tag_id
      -- , first_votes_on_notes.post_id as f_post_id
      -- , first_votes_on_notes.note_id as f_note_id
      , first_votes_on_notes.first_vote_on_this_note_rowid
      , vote_history.rowid
      , vote_history.*
      , case when 
          (first_vote_on_this_note_rowid is null or vote_history.rowid < first_vote_on_this_note_rowid)
          -- and direction == 1
        then true
        else null end before_note
    
      , params.upvotes as upvotes_given_shown_this_note
      , params.votes as votes_given_shown_this_note
    FROM 
       informed_tally params
       join vote_history using (tag_id, post_id)
    LEFT OUTER JOIN first_votes_on_notes on (
           first_votes_on_notes.tag_id = params.tag_id
       and first_votes_on_notes.post_id = params.post_id
       and first_votes_on_notes.note_id = params.note_id
       and first_votes_on_notes.user_id = vote_history.user_id
    )
)
, last_votes_before_note as (
    select
        p_tag_id as tag_id
        , p_post_id as post_id
        , p_note_id as note_id
        , user_id
        , direction
        , created
        , upvotes_given_shown_this_note
        , votes_given_shown_this_note
        , max(created)
    from  votes_before_note
    where
    before_note
    group by p_tag_id, p_post_id, p_note_id, user_id
)
select
    tag_id
  , post_id
  , note_id
  , sum(
    case direction
      when 1 then 1
      else 0
    end 
  ) as upvotes_given_not_shown_this_note
  , count(*) as votes_given_not_shown_this_note

  , upvotes_given_shown_this_note
  , votes_given_shown_this_note
from last_votes_before_note
group by tag_id, post_id, note_id;
