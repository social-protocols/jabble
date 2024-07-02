import { type Selectable, type Insertable } from 'kysely'
import type * as schema from '#app/types/kysely-types.ts'

// The types exported from kysely-types (which are generated from prisma.schema) are not used directly in app code.
// Instead, Kysely wants values of type Selectable<User>, Insertable<User>, etc. This is because what fields are
// required/optional depend on how the type is being used -- for example IDs are optional when inserting but required
// when selecting. Now, since it is the Selectable type, which has all fields that should exist in a DB record,  that we
// will generally want to use in App code, for convenience we export all of these in this file.

export type DBUser = Selectable<schema.User>
export type DBPost = Selectable<schema.Post>
export type DBPassword = Selectable<schema.Password>
export type DBPostStats = Selectable<schema.PostStats>
export type DBVerification = Selectable<schema.Verification>
export type DBScore = Selectable<schema.Score>
export type DBFullScore = Selectable<schema.FullScore>
export type DBLineage = Selectable<schema.Lineage>
export type DBEffect = Selectable<schema.Effect>
export type DBInsertableScore = Insertable<schema.Score>
export type DBVoteEvent = Selectable<schema.VoteEvent>
export type DBVote = Selectable<schema.Vote>
export type DBInsertableVoteEvent = Insertable<schema.VoteEvent>
export type DBHNItem = Selectable<schema.HNItem>
export type DBDiscussionOfTheDay = Selectable<schema.DiscussionOfTheDay>
