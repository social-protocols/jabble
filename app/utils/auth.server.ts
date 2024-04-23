import { createId } from '@paralleldrive/cuid2'
import { redirect } from '@remix-run/node'
import bcrypt from 'bcryptjs'
import { safeRedirect } from 'remix-utils/safe-redirect'
import { type Password, type User } from '#app/db/types.ts'
import { db } from '#app/db.ts'
import { combineHeaders } from './misc.tsx'
import { authSessionStorage } from './session.server.ts'

export const SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30
export const getSessionExpirationDate = () =>
  new Date(Date.now() + SESSION_EXPIRATION_TIME)

export const sessionKey = 'sessionId'

export async function getUserId(request: Request) {
  const authSession = await authSessionStorage.getSession(
    request.headers.get('cookie'),
  )
  const sessionId = authSession.get(sessionKey)
  if (!sessionId) return null

  // const session = await prisma.session.findUnique({
  // 	select: { user: { select: { id: true } } },
  // 	where: { id: sessionId, expirationDate: { gt: new Date() } },
  // })

  const session = await db
    .selectFrom('Session')
    .innerJoin('User', 'User.id', 'Session.userId')
    .select(['User.id as userId'])
    .where('Session.id', '=', sessionId)
    .where('Session.expirationDate', '>', new Date().valueOf())
    .executeTakeFirst()

  if (!session?.userId) {
    throw redirect('/', {
      headers: {
        'set-cookie': await authSessionStorage.destroySession(authSession),
      },
    })
  }
  return session.userId
}

export async function requireUserId(
  request: Request,
  { redirectTo }: { redirectTo?: string | null } = {},
) {
  const userId = await getUserId(request)
  if (!userId) {
    const requestUrl = new URL(request.url)
    redirectTo =
      redirectTo === null
        ? null
        : redirectTo ?? `${requestUrl.pathname}${requestUrl.search}`
    const loginParams = redirectTo ? new URLSearchParams({ redirectTo }) : null
    const loginRedirect = ['/login', loginParams?.toString()]
      .filter(Boolean)
      .join('?')
    throw redirect(loginRedirect)
  }
  return userId
}

export async function requireAnonymous(request: Request) {
  const userId = await getUserId(request)
  if (userId) {
    throw redirect('/')
  }
}

export async function login({
  username,
  password,
}: {
  username: User['username']
  password: string
}) {
  const user = await verifyUserPassword({ username }, password)
  if (!user) return null

  const session = await db
    .insertInto('Session')
    .values({
      id: createId(),
      expirationDate: getSessionExpirationDate().valueOf(),
      updatedAt: new Date().valueOf(),
      userId: user.id,
    })
    .returning(['id', 'expirationDate', 'userId'])
    .executeTakeFirstOrThrow()

  // const session = await prisma.session.create({
  // 	select: { id: true, expirationDate: true, userId: true },
  // 	data: {
  // 		expirationDate: getSessionExpirationDate(),
  // 		userId: user.id,
  // 	},
  // })
  return session
}

export async function resetUserPassword({
  username,
  password,
}: {
  username: User['username']
  password: string
}) {
  const hashedPassword = await bcrypt.hash(password, 10)

  const { id } = await db
    .selectFrom('User')
    .select(['id'])
    .where('username', '=', username)
    .executeTakeFirstOrThrow()

  await db
    .updateTable('Password')
    // .join("User", "User.id", "userId")
    .where('userId', '=', id)
    .set(() => ({
      hash: hashedPassword,
    }))
    .execute()
}

export async function signup({
  email,
  username,
  password,
}: {
  email: User['email']
  username: User['username']
  password: string
}) {
  const hashedPassword = await getPasswordHash(password)

  const { id } = await db
    .insertInto('User')
    .values({
      id: createId(),
      email: email.toLowerCase(),
      username: username.toLowerCase(),
    })
    .returning('id')
    .executeTakeFirstOrThrow()

  const pwRecord = await db
    .insertInto('Password')
    .values({
      hash: hashedPassword,
      userId: id,
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  return await db
    .insertInto('Session')
    .values({
      id: createId(),
      expirationDate: getSessionExpirationDate().valueOf(),
      userId: id,
      updatedAt: new Date().valueOf(),
    })
    .returning(['id', 'expirationDate'])
    .executeTakeFirstOrThrow()
}

export async function logout(
  {
    request,
    redirectTo = '/',
  }: {
    request: Request
    redirectTo?: string
  },
  responseInit?: ResponseInit,
) {
  const authSession = await authSessionStorage.getSession(
    request.headers.get('cookie'),
  )
  const sessionId = authSession.get(sessionKey)
  // if this fails, we still need to delete the session from the user's browser
  // and it doesn't do any harm staying in the db anyway.

  if (sessionId) db.deleteFrom('Session').where('id', '=', sessionId).execute()

  throw redirect(safeRedirect(redirectTo), {
    ...responseInit,
    headers: combineHeaders(
      { 'set-cookie': await authSessionStorage.destroySession(authSession) },
      responseInit?.headers,
    ),
  })
}

export async function getPasswordHash(password: string) {
  const hash = await bcrypt.hash(password, 10)
  return hash
}

export async function verifyUserPassword(
  where: Pick<User, 'username'> | Pick<User, 'id'>,
  password: Password['hash'],
) {
  let id
  if ('username' in where) {
    const user = await db
      .selectFrom('User')
      .where('username', '=', where.username)
      .select(['id'])
      .executeTakeFirst()

    if (!user) {
      return null
    }
    id = user.id
  } else {
    id = where.id
  }

  const { hash } = await db
    .selectFrom('Password')
    .where('userId', '=', id)
    .select('hash')
    .executeTakeFirstOrThrow()

  if (hash === null) {
    return null
  }

  const isValid = await bcrypt.compare(password, hash)

  if (!isValid) {
    return null
  }

  return { id }
}
