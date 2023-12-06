import type * as schema from "#app/db/kysely-types.ts";
import { type Selectable } from 'kysely';



// The types exported from kysely-types (which are generated from prisma.schema) are not used directly in app code.
// Instead, Kysely wants values of type Selectable<User>, Insertable<User>, etc. This is because what fields are
// required/optional depend on how the type is being used -- for example IDs are optional when inserting but required
// when selecting. Now, since it is the Selectable type, which has all fields that should exist in a DB record,  that we
// will generally want to use in App code, for convenience we export all of these in this file.

export type User = Selectable<schema.User>
export type Post = Selectable<schema.Post>
export type CurrentTally = Selectable<schema.CurrentTally>
export type CurrentInformedTally = Selectable<schema.CurrentInformedTally>
export type DetailedTally = Selectable<schema.DetailedTally>
export type Tag = Selectable<schema.Tag>
export type Password = Selectable<schema.Password>
export type PostStats = Selectable<schema.PostStats>
export type LocationStats = Selectable<schema.LocationStats>
export type ExplorationStats = Selectable<schema.ExplorationStats>
export type TagStats = Selectable<schema.TagStats>
