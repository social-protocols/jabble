import { type ColumnType, type Selectable, type Insertable } from 'kysely'

type Generated<T> =
	T extends ColumnType<infer S, infer I, infer U>
		? ColumnType<S, I | undefined, U>
		: ColumnType<T, T | undefined, T>

type Vote = {
	userId: string
	postId: number
	vote: number
	latestVoteEventId: number
	voteEventTime: number
}

type Password = {
	hash: string
	userId: string
}

type Post = {
	id: Generated<number>
	parentId: number | null
	content: string
	authorId: string
	createdAt: Generated<number>
	deletedAt: number | null
	isPrivate: number
}

type Fallacy = {
	postId: number
	detection: string
}

type PostStats = {
	postId: number
	replies: number
}

type Session = {
	id: string
	expirationDate: number
	createdAt: Generated<number>
	updatedAt: number
	userId: string
}

type User = {
	id: string
	email: string
	username: string
	createdAt: Generated<number>
	isAdmin: number
}

type Verification = {
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

type VoteEvent = {
	voteEventId: Generated<number>
	voteEventTime: Generated<number>
	userId: string
	parentId: number | null
	postId: number
	vote: number
}

type Score = {
	voteEventId: number
	voteEventTime: number
	postId: number
	o: number
	oCount: number
	oSize: number
	p: number
	score: number
}

type Effect = {
	postId: number
	commentId: number | null
	p: number
	pCount: number
	pSize: number
	q: number
	qCount: number
	qSize: number
	r: number
	weight: number
}

type EffectWithDefault = Effect

type EffectEvent = Effect & {
	voteEventId: number
	voteEventTime: number
}

type FullScore = Score &
	Effect & {
		criticalThreadId: number | null
	}

type Lineage = {
	ancestorId: number
	descendantId: number
	separation: number
}

type HNItem = {
	hnId: number
	postId: number
}

type Poll = {
	claimId: number
	postId: number
	pollType: string
}

type Artefact = {
	id: Generated<number>
	url: string
	createdAt: Generated<number>
}

type Quote = {
	id: Generated<number>
	artefactId: number
	quote: string
	createdAt: Generated<number>
}

type Claim = {
	id: Generated<number>
	quoteId: number
	claim: string
	postId: number | null
	createdAt: Generated<number>
}

type QuoteFallacy = {
	id: Generated<number>
	quoteId: number
	name: string
	rationale: string
	probability: number
	createdAt: Generated<number>
}

type Tag = {
	id: Generated<number>
	tag: string
}

type PostTag = {
	postId: number
	tagId: number
}

export type DB = {
	Vote: Vote
	Password: Password
	Post: Post
	Fallacy: Fallacy
	PostStats: PostStats
	Session: Session
	User: User
	Verification: Verification
	VoteEvent: VoteEvent
	Score: Score
	ScoreWithDefault: Score
	ScoreEvent: Score
	Effect: Effect
	EffectWithDefault: EffectWithDefault
	EffectEvent: EffectEvent
	FullScore: FullScore
	Lineage: Lineage
	HNItem: HNItem
	Claim: Claim
	Poll: Poll
	Artefact: Artefact
	Quote: Quote
	QuoteFallacy: QuoteFallacy
	Tag: Tag
	PostTag: PostTag
}

export type DBUser = Selectable<User>
export type DBPost = Selectable<Post>
export type DBPassword = Selectable<Password>
export type DBPostStats = Selectable<PostStats>
export type DBVerification = Selectable<Verification>
export type DBScore = Selectable<Score>
export type DBFullScore = Selectable<FullScore>
export type DBLineage = Selectable<Lineage>
export type DBEffect = Selectable<Effect>
export type DBInsertableScore = Insertable<Score>
export type DBVoteEvent = Selectable<VoteEvent>
export type DBVote = Selectable<Vote>
export type DBInsertableVoteEvent = Insertable<VoteEvent>
export type DBHNItem = Selectable<HNItem>
