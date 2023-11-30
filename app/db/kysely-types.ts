import type { ColumnType } from 'kysely'
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
	? ColumnType<S, I | undefined, U>
	: ColumnType<T, T | undefined, T>
export type Timestamp = ColumnType<Date, Date | string, Date | string>

export type CurrentInformedTally = {
	tagId: number
	postId: number
	noteId: number
	countGivenShownThisNote: number
	totalGivenShownThisNote: number
	countGivenNotShownThisNote: number
	totalGivenNotShownThisNote: number
}
export type CurrentTally = {
	tagId: number
	postId: number
	count: number
	total: number
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
	createdAt: Generated<string>
	updatedAt: string
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
	createdAt: Generated<string>
}
export type PostStats = {
	tagId: number
	postId: number
	attention: number
	views: number
	uniqueUsers: string
}
export type Role = {
	id: string
	name: string
	description: Generated<string>
	createdAt: Generated<string>
	updatedAt: string
}
export type RoleToUser = {
	A: string
	B: string
}
export type Session = {
	id: string
	expirationDate: string
	createdAt: Generated<string>
	updatedAt: string
	userId: string
}
export type SiteStats = {
	rowid: Generated<number>
	votes: number
}
export type Tag = {
	id: Generated<number>
	tag: string
}
export type User = {
	id: string
	email: string
	username: string
	name: string | null
	createdAt: Generated<string>
}
export type UserImage = {
	id: string
	altText: string | null
	contentType: string
	blob: Buffer
	createdAt: Generated<string>
	updatedAt: string
	userId: string
}
export type Verification = {
	id: string
	createdAt: Generated<string>
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
	expiresAt: string | null
}
export type VoteHistory = {
	rowid: Generated<number>
	userId: string
	tagId: number
	postId: number
	noteId: number | null
	direction: number
	createdAt: Generated<string>
}
export type DB = {
	_PermissionToRole: PermissionToRole
	_RoleToUser: RoleToUser
	CurrentInformedTally: CurrentInformedTally
	CurrentTally: CurrentTally
	LocationStats: LocationStats
	Password: Password
	Permission: Permission
	Post: Post
	PostStats: PostStats
	Role: Role
	Session: Session
	SiteStats: SiteStats
	Tag: Tag
	User: User
	UserImage: UserImage
	Verification: Verification
	VoteHistory: VoteHistory
}
