import { type ColumnType } from 'kysely'
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
	? ColumnType<S, I | undefined, U>
	: ColumnType<T, T | undefined, T>
export type Timestamp = ColumnType<Date, Date | string, Date | string>

export type CurrentInformedTally = {
	tagId: number
	postId: number
	noteId: number
	count: number
	total: number
}
export type CurrentTally = {
	tagId: number
	postId: number
	count: number
	total: number
}
export type CurrentVote = {
	userId: string
	tagId: number
	postId: number
	direction: number
	latest: number
	createdAt: number
}
export type DetailedTally = {
	tagId: number
	postId: number
	noteId: number
	countGivenShownThisNote: number
	totalGivenShownThisNote: number
	countGivenNotShownThisNote: number
	totalGivenNotShownThisNote: number
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
export type Permission = {
	id: string
	action: string
	entity: string
	access: string
	description: Generated<string>
	createdAt: Generated<number>
	updatedAt: number
}
export type PermissionToRole = {
	A: string
	B: string
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
export type Role = {
	id: string
	name: string
	description: Generated<string>
	createdAt: Generated<number>
	updatedAt: number
}
export type RoleToUser = {
	A: string
	B: string
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
	name: string | null
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
export type VoteHistory = {
	rowid: Generated<number>
	userId: string
	tagId: number
	postId: number
	noteId: number | null
	direction: number
	createdAt: Generated<number>
}
export type DB = {
	_PermissionToRole: PermissionToRole
	_RoleToUser: RoleToUser
	CurrentInformedTally: CurrentInformedTally
	CurrentTally: CurrentTally
	CurrentVote: CurrentVote
	DetailedTally: DetailedTally
	ExplorationStats: ExplorationStats
	LocationStats: LocationStats
	Password: Password
	Permission: Permission
	Post: Post
	PostStats: PostStats
	Role: Role
	Session: Session
	Tag: Tag
	TagStats: TagStats
	User: User
	Verification: Verification
	VoteHistory: VoteHistory
}
