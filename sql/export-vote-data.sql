.mode csv
.output stdout
select 
	rowid as voteEventId,
	userId,
	tagId,
	parentId,
	postId,
	noteId,
	direction as vote,
	voteHistory.createdAt
	from voteHistory join post on postId = id
	-- where tagId = 3
;
.exit

