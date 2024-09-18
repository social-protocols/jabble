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
	isPrivate: number
}
export type Fallacy = {
	postId: number
	detection: string
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
	parentId: number | null
	postId: number
	vote: number
}

export type Score = {
	voteEventId: number
	voteEventTime: number
	postId: number
	o: number
	oCount: number
	oSize: number
	p: number
	score: number
}

export type Effect = {
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

export type EffectWithDefault = Effect

export type EffectEvent = Effect & {
	voteEventId: number
	voteEventTime: number
}

export type FullScore = Score &
	Effect & {
		criticalThreadId: number | null
	}

export type Lineage = {
	ancestorId: number
	descendantId: number
	separation: number
}

export type HNItem = {
	hnId: number
	postId: number
}

export type PlaygroundPost = {
	id: Generated<number>
	content: string
	detection: string
	createdAt: Generated<number>
}

export type Claim = {
	id: Generated<number>
	claim: string
}

export type Poll = {
	claimId: number
	postId: number
	pollType: string
}

export type Artefact = {
	id: Generated<number>
	url: string
	description: string | null
	createdAt: Generated<number>
}

export type Quote = {
	id: Generated<number>
	artefactId: number
	quote: string
	createdAt: Generated<number>
}

export type ClaimToArtefact = {
	claimId: number
	artefactId: number
}

export type CandidateClaim = {
	id: Generated<number>
	artefactId: number
	quoteId: number
	claim: string
	createdAt: Generated<number>
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
	PlaygroundPost: PlaygroundPost
	Claim: Claim
	Poll: Poll
	Artefact: Artefact
	Quote: Quote
	ClaimToArtefact: ClaimToArtefact
	CandidateClaim: CandidateClaim
}
