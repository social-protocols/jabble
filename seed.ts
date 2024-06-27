import bcrypt from 'bcryptjs'
import { Direction } from '#app/api-types.ts'
import { db } from '#app/db.ts'
import { createPost } from '#app/post.ts'
import { getPasswordHash } from '#app/utils/auth.server.ts'
import { vote } from '#app/vote.ts'

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
		return await createPost(
			trx,
			null,
			'So, pregnant people can’t cross state lines to get abortions but guys like Kyle Rittenhouse can cross state lines to murder people. Seems fair.',
			alice,
			{ isPrivate: false, withUpvote: true },
		)
	})

	// Then bob posts a response to alice's post
	let post2 = await db.transaction().execute(async trx => {
		return await createPost(
			trx,
			post1,
			'Kyle Rittenhouse was acquitted of murder charges. Clear video evidence showed he acted in self defense.',
			bob,
			{ isPrivate: false, withUpvote: true },
		)
	})

	// And also downvotes
	db.transaction().execute(
		async trx => await vote(trx, bob, post1, Direction.Down),
	)

	// And responds to bob's response
	await db.transaction().execute(async trx => {
		return await createPost(
			trx,
			post2,
			'That trial was a sham. They were never going to convict.',
			alice,
			{ isPrivate: false, withUpvote: true },
		)
	})

	// And then creates another unrelated post
	let post4 = await db.transaction().execute(async trx => {
		return await createPost(
			trx,
			null,
			'Sudafed, Benadryl and most decongestants don’t work: FDA advisory panel https://trib.al/sJmOJBP',
			alice,
			{ isPrivate: false, withUpvote: true },
		)
	})

	// And respond's to Alices's latest post
	await db.transaction().execute(async trx => {
		return await createPost(
			trx,
			post4,
			'This is misleading. Regular Benadryl is an antihistamine; it is not a decongestant. There is a Benadryl branded product that is impacted. https://www.nbcnews.com/news/amp/rcna104424',
			bob,
			{ isPrivate: false, withUpvote: true },
		)
	})

	// Alice post's again
	let post6 = await db.transaction().execute(async trx => {
		return await createPost(
			trx,
			null,
			"Right now, real wages for the average American worker is higher than it was before the pandemic, with lower wage workers seeing the largest gains. That's Bidenomics.",
			alice,
			{ isPrivate: false, withUpvote: true },
		)
	})

	// And respond's to Alice's third post
	await db.transaction().execute(async trx => {
		return await createPost(
			trx,
			post6,
			"The tweet's claim about real wages contains a factual error. On 3/15/20 when US COVID lockdowns began real wages adjusted for inflation (AFI) were $11.15. As of 7/16/23 real wages AFI are $11.05. Real wages AFI remain lower (not higher) than before the pandemic.",
			bob,
			{ isPrivate: false, withUpvote: true },
		)
	})

	await db.transaction().execute(async trx => {
		await vote(trx, alice, post6, Direction.Down)

		// agreed with 2 (shown 3)
		await vote(trx, charlie, post2, Direction.Up)

		// changed mind after seeing 2
		await vote(trx, charlie, post1, Direction.Down)

		// changed mind back (for no particular reason)
		await vote(trx, charlie, post1, Direction.Up)

		// duplicate vote
		await vote(trx, charlie, post1, Direction.Up)

		// changed mind back again
		await vote(trx, charlie, post1, Direction.Down)

		// and s some other votes
		await vote(trx, charlie, post1, Direction.Down)
		await vote(trx, charlie, post2, Direction.Down)
		await vote(trx, charlie, post2, Direction.Up)
		await vote(trx, charlie, 3, 1)
		await vote(trx, charlie, 2, -1)
		await vote(trx, bob, 6, -1)
		await vote(trx, alice, 5, -1)
		await vote(trx, alice, 4, -1)
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
