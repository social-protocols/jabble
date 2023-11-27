import { prisma } from '#app/utils/db.server.ts';
import * as fs from 'fs';

import {
	// cleanupDb,
	createPassword,
} from '#tests/db-utils.ts';

import { createPost } from '#app/post.ts';
import { Direction, vote } from '#app/vote.ts';

async function seed() {

	console.time('🔑 Created permissions...')
	const entities = ['user', 'note']
	const actions = ['create', 'read', 'update', 'delete']
	const accesses = ['own', 'any'] as const
	for (const entity of entities) {
		for (const action of actions) {
			for (const access of accesses) {
				await prisma.permission.create({ data: { entity, action, access } })
			}
		}
	}
	console.timeEnd('🔑 Created permissions...')

	console.time('👑 Created roles...')
	await prisma.role.create({
		data: {
			name: 'admin',
			permissions: {
				connect: await prisma.permission.findMany({
					select: { id: true },
					where: { access: 'any' },
				}),
			},
		},
	})
	await prisma.role.create({
		data: {
			name: 'user',
			permissions: {
				connect: await prisma.permission.findMany({
					select: { id: true },
					where: { access: 'own' },
				}),
			},
		},
	})
	console.timeEnd('👑 Created roles...')


	// since prisma provides the cuid() function (not supported by sqlite), we use prisma statements instead of sql to create users
	// insert into user(idInt, username, email) values (100, "user100", "user100@test.com");
	// insert into user(idInt, username, email) values (101, "user101", "user101@test.com");
	let user100 = "100"
	let user101 = "101"
	await prisma.user.create({
		data: { id: user100, username: 'user100', email: 'user100@test.com', password: { create: createPassword('user100') } },
	})
	await prisma.user.create({
		data: { id: '101', username: 'user101', email: 'user101@test.com' },
	})


	const tag = "global"
	let post1 = await createPost(tag, null, 'So, pregnant people can’t cross state lines to get abortions but guys like Kyle Rittenhouse can cross state lines to murder people. Seems fair.', user100)	
	let post2 = await createPost(tag, post1, 'Kyle Rittenhouse was acquitted of murder charges. Clear video evidence showed he acted in self defense.', user101)	
	await vote(tag, user101, post1, post2, Direction.Down)
	let post3 = await createPost(tag, post1, 'That trial was a sham. They were never going to convict.', user100)

	//insert into post(id, parentId, authorId, content) values (4, null, 100, );
	let post4 = await createPost(tag, null, 'Sudafed, Benadryl and most decongestants don’t work: FDA advisory panel https://trib.al/sJmOJBP', user100)
	let post5 = await createPost(tag, post4, 'This is misleading. Regular Benadryl is an antihistamine; it is not a decongestant. There is a Benadryl branded product that is impacted. https://www.nbcnews.com/news/amp/rcna104424', user101)

	// insert into voteHistory(tagId, postId, noteId, userId, direction) values (1, 4, null, 100, 1);

	let post6 = await createPost(tag, null, 'Right now, real wages for the average American worker is higher than it was before the pandemic, with lower wage workers seeing the largest gains. That\'s Bidenomics.', user100)
	let post7 = await createPost(tag, post6, 'The tweet\'s claim about real wages contains a factual error. On 3/15/20 when US COVID lockdowns began real wages adjusted for inflation (AFI) were $11.15. As of 7/16/23 real wages AFI are $11.05. Real wages AFI remain lower (not higher) than before the pandemic.', user101)
	await vote(tag, user100, post6, post7, Direction.Down)

	// agreed with 2 (shown 3)
	await vote(tag, user100, post2, post3, Direction.Up)
	// changed mind after seeing 2
	await vote(tag, user100, post1, post2, Direction.Down)
	// changed mind back (for no particular reason)
	await vote(tag, user100, post1, post2, Direction.Up)

	// duplicate vote
	await vote(tag, user100, post1, post2, Direction.Up)

	// changed mind back again
	await vote(tag, user100, post1, post2, Direction.Down)


	await vote(tag, user101, post1, post2, Direction.Down)
	await vote(tag, user101, post2, post3, Direction.Down)
	await vote(tag, user101, post2, post3, Direction.Up)
}

seed()
	.catch(e => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
