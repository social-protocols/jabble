
drop table if exists Vote;
create table if not exists Vote (
  userId string,
  tagId Integer not null,
  postId integer not null,
  direction Integer not null,
  latest integer NOT NULL,
  createdAt DATETIME NOT NULL,
  primary key(userId, tagId, postId)
);


drop table if exists Tally;
create table if not exists Tally (
  tagId Integer not null,
  postId integer not null,
  count Integer not null,
  total Integer not null,
  primary key(tagId, postId)
 );

drop table if exists InformedVote;
create table if not exists InformedVote (
  userId string,
  tagId Integer not null,
  postId integer not null,
  noteId integer not null,
  direction Integer not null,
  latest integer NOT NULL,
  createdAt DATETIME NOT NULL,
  primary key(userId, tagId, postId, noteId)
);


drop table if exists InformedTally;
create table if not exists InformedTally (
  tagId Integer not null,
  postId integer not null,
  noteId integer not null,
  count Integer not null,
  total Integer not null,
  firstVote DateTime not null,
  primary key(tagId, postId, noteId)
 );



drop trigger if exists insertVote;
create trigger insertVote after insert on VoteHistory
  begin
  insert into Vote(userId, tagId, postId, direction, latest, createdAt) values (
    new.userId,
    new.tagId,
    new.postId,
    new.direction,
    new.rowid,
    new.createdAt
  ) on conflict(userId, tagId, postId) do update set
    direction = new.direction,
    latest = new.rowid,
    createdAt = new.createdAt
  ;
  end;


drop trigger if exists insertTally;
create trigger insertTally after insert on Vote
  begin
  insert into Tally(tagId, postId, count, total) values (
    new.tagId,
    new.postId,
    (new.direction == 1),
    new.direction != 0
  ) on conflict(tagId, postId) do update 
    set 
      total = total + (new.direction != 0),
      count = count + (new.direction == 1)
  ;
  end;


drop trigger if exists updateTally;
create trigger updateTally after update on Vote
  begin
  update Tally
    set 
      total = total + (new.direction != 0) - (old.direction != 0),
      count = count + (new.direction == 1) - (old.direction == 1)
  where
    tagId = new.tagId
    and postId = new.postId
  ;
  end;




drop trigger if exists insertInformedVote;
create trigger insertInformedVote after insert on VoteHistory
  -- when new.noteId is not null
  begin
  insert into InformedVote(userId, tagId, postId, noteId, direction, latest, createdAt) values (
    new.userId,
    new.tagId,
    new.postId,
    ifnull(new.noteId,0),
    new.direction,
    new.rowid,
    new.createdAt
  ) on conflict(userId, tagId, postId, noteId) do update set
    direction = new.direction,
    latest = new.rowid,
    createdAt = new.createdAt
  ;
  end;



drop trigger if exists insertInformedTally;
create trigger insertInformedTally after insert on InformedVote
  begin
  insert into InformedTally(tagId, postId, noteId, count, total, firstVote) values (
    new.tagId,
    new.postId,
    new.noteId,
    (new.direction == 1),
    new.direction != 0,
    new.createdAt
  ) on conflict(tagId, postId, noteId) do update 
    set 
      total = total + (new.direction != 0),
      count = count + (new.direction == 1)
  ;
  end;


drop trigger if exists updateInformedTally;
create trigger updateInformedTally after update on InformedVote
  begin
  update InformedTally
    set 
      total = total + (new.direction != 0) - (old.direction != 0),
      count = count + (new.direction == 1) - (old.direction == 1)
  where
    tagId = new.tagId
    and postId = new.postId
    and noteId = ifnull(new.noteId,0)
  ;
  end;

create view detailedTally as
with a as (
  select
    tagId 
    , postId
    , noteId
    , count as countGivenShownNoteOnly
    , total as totalGivenShownNoteOnly

    , sum(count) over (partition by tagId, postId order by firstVote) - count as countBeforeNote
    , sum(total) over (partition by tagId, postId order by firstVote) - total as totalBeforeNote

  from InformedTally
  group by tagId, postId, noteId 
)
select * from a where noteId is not null;

