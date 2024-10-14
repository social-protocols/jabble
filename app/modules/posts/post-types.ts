import { type Artefact, type Quote } from '../claims/claim-types.ts'
import { type FallacyList } from '../fallacies/fallacy-types.ts'

export type Post = {
	id: number
	parentId: number | null
	content: string
	createdAt: number
	deletedAt: number | null
	isPrivate: number
	pollType: PollType | null
}

export type PostWithScore = Post & { score: number }

export type FrontPagePost = Post & {
	fallacyList: FallacyList
	oSize: number
	nTransitiveComments: number
	p: number
}

export type Poll = Post & {
	context: {
		artefact: Artefact
		quote: Quote | null
	} | null
	oSize: number
	nTransitiveComments: number
	p: number
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
