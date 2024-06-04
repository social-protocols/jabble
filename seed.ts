import bcrypt from 'bcryptjs'
import { db } from '#app/db.ts'
import { createPost } from '#app/post.ts'
import { getRankedPosts } from '#app/ranking.ts'

import { getPasswordHash } from '#app/utils/auth.server.ts'
import { Direction, vote } from '#app/vote.ts'

export async function seed() {
	console.log('seeding...')

	let alice = '100'
	let bob = '101'
	let charlie = '102'

	await db
		.insertInto('User')
		.values({
			id: alice,
			username: 'alice',
			email: 'alice@test.com',
			isAdmin: 0,
		})
		.execute()

	await db
		.insertInto('Password')
		.values({
			userId: alice,
			hash: await getPasswordHash('123456'),
		})
		.execute()

	await db
		.insertInto('User')
		.values({
			id: bob,
			username: 'bob',
			email: 'bob@test.com',
			isAdmin: 0,
			// password: { create: createPassword('bob') },
		})
		.execute()

	await db
		.insertInto('User')
		.values({
			id: charlie,
			username: 'charlie',
			email: 'charlie@test.com',
			isAdmin: 0,
			// password: { create: createPassword('charlie') },
		})
		.execute()

	// await seedStats()

	// First, alice creates a post
	let post1 = await db.transaction().execute(async trx => {
		return createPost(
			trx,
			null,
			'So, pregnant people can’t cross state lines to get abortions but guys like Kyle Rittenhouse can cross state lines to murder people. Seems fair.',
			alice,
			false,
		)
	})

	// Then, bob views the page
	await db.transaction().execute(async trx => await getRankedPosts(trx))

	// Then bob posts a response to alice's post
	let post2 = await db.transaction().execute(async trx => {
		return createPost(
			trx,
			post1,
			'Kyle Rittenhouse was acquitted of murder charges. Clear video evidence showed he acted in self defense.',
			bob,
			false,
		)
	})

	// And also downvotes (with their own post as a note -- this is an important detail)
	db.transaction().execute(
		async trx => await vote(trx, bob, post1, post2, Direction.Down),
	)

	// bob views home page
	db.transaction().execute(async trx => await getRankedPosts(trx))

	// And responds to bob's response
	let post3 = await db.transaction().execute(async trx => {
		return createPost(
			trx,
			post2,
			'That trial was a sham. They were never going to convict.',
			alice,
			false,
		)
	})

	// And then creates another unrelated post
	let post4 = await db.transaction().execute(async trx => {
		return createPost(
			trx,
			null,
			'Sudafed, Benadryl and most decongestants don’t work: FDA advisory panel https://trib.al/sJmOJBP',
			alice,
			false,
		)
	})

	// Bob then views the page again
	await db.transaction().execute(async trx => getRankedPosts(trx))

	// And respond's to Alices's latest post
	await db.transaction().execute(async trx => {
		return createPost(
			trx,
			post4,
			'This is misleading. Regular Benadryl is an antihistamine; it is not a decongestant. There is a Benadryl branded product that is impacted. https://www.nbcnews.com/news/amp/rcna104424',
			bob,
			false,
		)
	})

	// Alice post's again
	let post6 = await db.transaction().execute(async trx => {
		return createPost(
			trx,
			null,
			"Right now, real wages for the average American worker is higher than it was before the pandemic, with lower wage workers seeing the largest gains. That's Bidenomics.",
			alice,
			false,
		)
	})

	// Bob then views the page once again
	await db.transaction().execute(async trx => getRankedPosts(trx))
	// console.log("Ranked posts", posts)

	// And respond's to Alice's third post
	let post7 = await db.transaction().execute(async trx => {
		return createPost(
			trx,
			post6,
			"The tweet's claim about real wages contains a factual error. On 3/15/20 when US COVID lockdowns began real wages adjusted for inflation (AFI) were $11.15. As of 7/16/23 real wages AFI are $11.05. Real wages AFI remain lower (not higher) than before the pandemic.",
			bob,
			false,
		)
	})

	await db.transaction().execute(async trx => {
		vote(trx, alice, post6, post7, Direction.Down)

		// agreed with 2 (shown 3)
		vote(trx, charlie, post2, post3, Direction.Up)

		// changed mind after seeing 2
		vote(trx, charlie, post1, post2, Direction.Down)

		// changed mind back (for no particular reason)
		vote(trx, charlie, post1, post2, Direction.Up)

		// duplicate vote
		vote(trx, charlie, post1, post2, Direction.Up)

		// changed mind back again
		vote(trx, charlie, post1, post2, Direction.Down)

		// and s some other votes
		vote(trx, charlie, post1, post2, Direction.Down)
		vote(trx, charlie, post2, post3, Direction.Down)
		vote(trx, charlie, post2, post3, Direction.Up)
		vote(trx, charlie, 3, null, 1)
		vote(trx, charlie, 2, null, -1)
		vote(trx, bob, 6, null, -1)
		vote(trx, alice, 5, null, -1)
		vote(trx, alice, 4, null, -1)
	})

	// Create developer user with password 'password'. Can login with this user by pointing browser to /dev-login
	const id = 'developer'
	await db
		.insertInto('User')
		.values({
			id: id,
			username: 'developer',
			email: 'test@test.com',
			isAdmin: 0,
		})
		.execute()

	const hashedPassword = await bcrypt.hash('password', 10)

	await db
		.insertInto('Password')
		.values({
			hash: hashedPassword,
			userId: id,
		})
		.returningAll()
		.executeTakeFirstOrThrow()

	// Create test admin user with password 'password'. For testing admin features.
	const adminId = 'testadmin'
	await db
		.insertInto('User')
		.values({
			id: adminId,
			username: 'testadmin',
			email: 'admin@test.com',
			isAdmin: 1,
		})
		.execute()

	const hashedAdminPassword = await bcrypt.hash('password', 10)

	await db
		.insertInto('Password')
		.values({
			hash: hashedAdminPassword,
			userId: adminId,
		})
		.returningAll()
		.executeTakeFirstOrThrow()
}

seed().catch(e => {
	console.error(e)
	process.exit(1)
})
