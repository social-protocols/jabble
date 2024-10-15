import {
	type ClaimContext,
	type Artefact,
	type Quote,
} from '../claims/claim-types.ts'

export type Post = {
	id: number
	parentId: number | null
	content: string
	createdAt: number
	deletedAt: number | null
	isPrivate: number
}

export type Poll = Post & {
	pollType: PollType
	context: ClaimContext
}

export type FrontPagePost = Post & {
	oSize: number
	nTransitiveComments: number
	p: number
}

export type FrontPagePoll = FrontPagePost & {
	pollType: PollType
	context: {
		artefact: Artefact
		quote: Quote | null
	} | null
}

export type StatsPost = Post & {
	voteEventId: number
	voteEventTime: number
	postId: number
	o: number
	oCount: number
	oSize: number
	p: number
	score: number

	commentId: number | null
	pCount: number
	pSize: number
	q: number
	qCount: number
	qSize: number
	r: number
	weight: number

	criticalThreadId: number | null
}

export enum PollType {
	FactCheck = 'factCheck',
	Opinion = 'opinion',
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

export enum VoteDirection {
	Up = 1,
	Down = -1,
	Neutral = 0,
}

export type VoteState = {
	postId: number
	vote: VoteDirection
	isInformed: boolean
}
