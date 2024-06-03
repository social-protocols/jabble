import { type ColumnType } from 'kysely'
export type Generated<T> =
	T extends ColumnType<infer S, infer I, infer U>
		? ColumnType<S, I | undefined, U>
		: ColumnType<T, T | undefined, T>
export type Timestamp = ColumnType<Date, Date | string, Date | string>

export type Vote = {
	userId: string
	postId: number
	vote: number
	latestVoteEventId: number
	voteEventTime: number
}
export type Password = {
	hash: string
	userId: string
}
export type Post = {
	id: Generated<number>
	parentId: number | null
	content: string
	authorId: string
	createdAt: Generated<number>
	deletedAt: number | null
}
export type PostStats = {
	postId: number
	replies: number
}
export type Session = {
	id: string
	expirationDate: number
	createdAt: Generated<number>
	updatedAt: number
	userId: string
}
export type User = {
	id: string
	email: string
	username: string
	createdAt: Generated<number>
	isAdmin: number
}
export type Verification = {
	id: string
	createdAt: Generated<number>
	/**
	 * The type of verification, e.g. "email" or "phone"
	 */
	type: string
	/**
	 * The thing we're trying to verify, e.g. a user's email or phone number
	 */
	target: string
	/**
	 * The secret key used to generate the otp
	 */
	secret: string
	/**
	 * The algorithm used to generate the otp
	 */
	algorithm: string
	/**
	 * The number of digits in the otp
	 */
	digits: number
	/**
	 * The number of seconds the otp is valid for
	 */
	period: number
	/**
	 * The valid characters for the otp
	 */
	charSet: string
	/**
	 * When it's safe to delete this verification
	 */
	expiresAt: number | null
}

export type VoteEvent = {
	voteEventId: Generated<number>
	voteEventTime: Generated<number>
	userId: string
	tagId: number
	parentId: number | null
	postId: number
	noteId: number | null
	vote: number
}

export type Score = {
	voteEventId: number
	voteEventTime: number
	parentId: number | null
	postId: number
	topNoteId: number | null
	criticalThreadId: number | null
	o: number
	oCount: number
	oSize: number
	p: number
	score: number
}

export type Effect = {
	voteEventId: number
	voteEventTime: number
	postId: number
	noteId: number | null
	topSubthreadId: number | null
	p: number
	pCount: number
	pSize: number
	q: number
	qCount: number
	qSize: number
	r: number
}

export type FullScore = {
	voteEventId: number
	voteEventTime: number
	postId: number
	noteId: number | null
	topSubthreadId: number | null
	p: number
	pCount: number
	pSize: number
	q: number
	qCount: number
	qSize: number
	r: number
	topNoteId: number | null
	criticalThreadId: number | null
	o: number
	oCount: number
	oSize: number
	score: number
}

export type DB = {
	Vote: Vote
	Password: Password
	Post: Post
	PostStats: PostStats
	Session: Session
	User: User
	Verification: Verification
	VoteEvent: VoteEvent
	Score: Score
	ScoreEvent: Score
	Effect: Effect
	EffectEvent: Effect
	FullScore: FullScore
}
