import { type ColumnType } from 'kysely'
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
	? ColumnType<S, I | undefined, U>
	: ColumnType<T, T | undefined, T>
export type Timestamp = ColumnType<Date, Date | string, Date | string>


export type Vote = {
	userId: string
	tagId: number
	postId: number
	vote: number
	latest: number
	createdAt: number
}


export type ExplorationStats = {
	rowid: Generated<number>
	votes: number
}
export type LocationStats = {
	locationType: number
	oneBasedRank: number
	voteShare: number
	latestSitewideVotes: number
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
}
export type PostStats = {
	tagId: number
	postId: number
	attention: number
	views: number
	replies: number
}
export type Session = {
	id: string
	expirationDate: number
	createdAt: Generated<number>
	updatedAt: number
	userId: string
}
export type Tag = {
	id: Generated<number>
	tag: string
}
export type TagStats = {
	tagId: number
	views: number
	votesPerView: number
}
export type User = {
	id: string
	email: string
	username: string
	createdAt: Generated<number>
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
	userId: string
	tagId: number
	parentId: number | null
	postId: number
	noteId: number | null
	vote: number
	createdAt: Generated<number>
}

export type ScoreData = {
      tagId: number|null
    , parentId: number|null
    , postId: number
    , topNoteId: number|null
    , parentP: number|null
    , parentQ: number|null
    , p: number
    , q: number
    , count: number
    , sampleSize: number
    , updatedAt: Generated<number>
}


export type DB = {
	Vote: Vote
	ExplorationStats: ExplorationStats
	LocationStats: LocationStats
	Password: Password
	Post: Post
	PostStats: PostStats
	Session: Session
	Tag: Tag
	TagStats: TagStats
	User: User
	Verification: Verification
	VoteEvent: VoteEvent
	ScoreData: ScoreData
}
