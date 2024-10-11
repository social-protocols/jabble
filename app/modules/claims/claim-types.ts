export type Artefact = {
	id: number
	url: string
	createdAt: number
}

export type Quote = {
	id: number
	artefactId: number
	quote: string
	createdAt: number
}

export type Claim = {
	id: number
	quoteId: number
	claim: string
	postId: number | null
	createdAt: number
}

export type QuoteFallacy = {
	id: number
	quoteId: number
	name: string
	rationale: string
	probability: number
	createdAt: number
}

export type ClaimContext = {
	artefact: Artefact
	quote: Quote
}
