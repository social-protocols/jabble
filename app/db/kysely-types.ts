import { type ColumnType } from 'kysely'
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
	? ColumnType<S, I | undefined, U>
	: ColumnType<T, T | undefined, T>

export type PermissionToRole = {
	A: string
	B: string
}

export type RoleToUser = {
	A: string
	B: string
}

export type CurrentInformedTally = {
	count: number
	noteId: number
	postId: number
	tagId: number
	total: number
}
export type CurrentTally = {
	count: number
	postId: number
	tagId: number
	total: number
}

export interface CurrentInformedTallyOld {
	countGivenNotShownThisNote: string | null
	countGivenShownThisNote: string | null
	noteId: number | null
	postId: number | null
	tagId: number | null
	totalGivenNotShownThisNote: string | null
	totalGivenShownThisNote: string | null
}

export interface CurrentInformedVote {
	createdAt: string | null
	direction: number | null
	noteId: number | null
	postId: number | null
	tagId: number | null
	userId: string | null
}

export type CurrentVote = {
	createdAt: string
	direction: number
	latest: number
	postId: number
	tagId: number
	userId: string
}
export type DetailedTally = {
	countGivenNotShownThisNote: number
	countGivenShownThisNote: number
	noteId: number
	postId: number
	tagId: number
	totalGivenNotShownThisNote: number
	totalGivenShownThisNote: number
}
export type ExplorationStats = {
	rowid: Generated<number>
	votes: number
}
export type LocationStats = {
	latestSitewideVotes: number
	locationType: number
	oneBasedRank: number
	voteShare: number
}
export type Password = {
	hash: string
	userId: string
}
export type Permission = {
	access: string
	action: string
	createdAt: Generated<string>
	description: Generated<string>
	entity: string
	id: string
	updatedAt: string
}
export type Post = {
	authorId: string
	content: string
	createdAt: Generated<string>
	id: Generated<number>
	parentId: number | null
}
export type PostStats = {
	attention: number
	postId: number
	replies: number
	tagId: number
	views: number
}
export type Role = {
	createdAt: Generated<string>
	description: Generated<string>
	id: string
	name: string
	updatedAt: string
}
export type Session = {
	createdAt: Generated<string>
	expirationDate: string
	id: string
	updatedAt: string
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
	createdAt: Generated<string>
	email: string
	id: string
	name: string | null
	username: string
}
export type UserImage = {
	altText: string | null
	blob: Buffer
	contentType: string
	createdAt: Generated<string>
	id: string
	updatedAt: string
	userId: string
}
export type Verification = {
	algorithm: string
	charSet: string
	createdAt: Generated<string>
	digits: number
	expiresAt: string | null
	id: string
	period: number
	secret: string
	target: string
	type: string
}
export type VoteHistory = {
	createdAt: Generated<string>
	direction: number
	noteId: number | null
	postId: number
	rowid: Generated<number>
	tagId: number
	userId: string
}
export type DB = {
	_PermissionToRole: PermissionToRole
	_RoleToUser: RoleToUser
	CurrentInformedTally: CurrentInformedTally
	currentInformedTallyOld: CurrentInformedTallyOld
	currentInformedVote: CurrentInformedVote
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
	UserImage: UserImage
	Verification: Verification
	VoteHistory: VoteHistory
}
