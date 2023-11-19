import { prisma } from '#app/utils/db.server.ts';
// import { cleanupDb, createPassword, createUser } from '#tests/db-utils.ts'

// async function seed() {
// 	console.log('🌱 Seeding...')
// 	console.time(`🌱 Database has been seeded`)

// 	console.time('🧹 Cleaned up the database...')
// 	// await cleanupDb(prisma)
// 	console.timeEnd('🧹 Cleaned up the database...')

// 	if (process.env.MINIMAL_SEED) {
// 		console.log('👍 Minimal seed complete')
// 		console.timeEnd(`🌱 Database has been seeded`)
// 		return
// 	}


// 	await prisma.tag.create({
// 		select: { id: true },
// 		data: {
// 			id: 0,
// 			tag: 'global',
// 		}
// 	})

// 	await prisma.user.create({
// 		select: { id: true },
// 		data: {
// 			id: 100,
// 			email: 'user1@nowhere.dev',
// 			username: 'user1',
// 			name: 'User 1',
// 			// password: { create: createPassword('kodylovesyou') },
// 			// id: 100,
// 			posts: {
// 				create: [
// 					{
// 						id: 1,
// 						content:
// 							'So, pregnant people can\’t cross state lines to get abortions but guys like Kyle Rittenhouse can cross state lines to murder people. Seems fair.',
// 					},
// 				],
// 			},
// 			voteHistory: {
// 				create: [
// 					// upvote own post
// 					{
// 						tagId: 0,
// 						postId: 1,
// 						direction: 1,	
// 					},
// 				]
// 			}
// 		},
// 	})

// 	await prisma.user.create({
// 		select: { id: true },
// 		data: {
// 			id: 101,
// 			email: 'user2@nowhere.dev',
// 			username: 'user2',
// 			name: 'User 2',
// 			// password: { create: createPassword('kodylovesyou') },
// 			// id: 101,
// 			posts: {
// 				create: [
// 					{
// 						id: 2,
// 						content:
// 							'Kyle Rittenhouse was acquitted of murder charges. Clear video evidence showed he acted in self defense.',
// 						parentId: 1,
// 					},
// 				],
// 			},
// 			voteHistory: {
// 				create: [
// 					// upvote own reply
// 					{
// 						tagId: 0,
// 						postId: 2,
// 						direction: 1,	
// 					},
// 					// downvote original post
// 					{
// 						tagId: 0,
// 						postId: 1,
// 						direction: -1,	
// 					},
// 				]
// 			}
// 		},
// 	})


// 	await prisma.post.create({
// 		select: { id: true },
// 		data: {
// 			id: 3,
// 			parentId: 2,
// 			authorId: 100,
// 			content:
// 				'That trial was a sham. They were never going to convict.',
// 		}
// 	})

	

// 	console.timeEnd(`🌱 Database has been seeded`)

// }

async function seed() {
	// const { PrismaClient } = require('@prisma/client');
	// const prisma = new PrismaClient();

	const insertStatements = `
insert into user(id, username, email) values (100, "user100", "user100@test.com");
insert into user(id, username, email) values (101, "user101", "user101@test.com");

insert into tag(id, tag) values (0, 'global');


insert into post(id, parent_id, author_id, content) values (1, null, 100, 'So, pregnant people can’t cross state lines to get abortions but guys like Kyle Rittenhouse can cross state lines to murder people. Seems fair.');
insert into vote_history(tag_id, post_id, note_id, user_id, direction) values (0, 1, null, 100, 1);
insert into post(id, parent_id, author_id, content) values (2, 1, 101, 'Kyle Rittenhouse was acquitted of murder charges. Clear video evidence showed he acted in self defense.');
insert into vote_history(tag_id, post_id, note_id, user_id, direction) values (0, 2, null, 101, 1);
insert into post(id, parent_id, author_id, content) values (3, 2, 100, 'That trial was a sham. They were never going to convict.');
insert into vote_history(tag_id, post_id, note_id, user_id, direction) values (0, 3, null, 100, 1);


insert into post(id, parent_id, author_id, content) values (4, null, 100, 'Sudafed, Benadryl and most decongestants don’t work: FDA advisory panel https://trib.al/sJmOJBP');
insert into vote_history(tag_id, post_id, note_id, user_id, direction) values (0, 4, null, 100, 1);
insert into post(id, parent_id, author_id, content) values (5, 4, 100, 'This is misleading. Regular Benadryl is an antihistamine; it is not a decongestant. There is a Benadryl branded product that is impacted. https://www.nbcnews.com/news/amp/rcna104424');
insert into vote_history(tag_id, post_id, note_id, user_id, direction) values (0, 5, null, 101, 1);

insert into post(id, parent_id, author_id, content) values (6, null, 100, 'Right now, real wages for the average American worker is higher than it was before the pandemic, with lower wage workers seeing the largest gains. That''s Bidenomics.');
insert into vote_history(tag_id, post_id, note_id, user_id, direction) values (0, 6, null, 100, 1);
insert into post(id, parent_id, author_id, content) values (7, 6, 100, 'The tweet’s claim about real wages contains a factual error. On 3/15/20 when US COVID lockdowns began real wages adjusted for inflation (AFI) were $11.15. As of 7/16/23 real wages AFI are $11.05. Real wages AFI remain lower (not higher) than before the pandemic.');
insert into vote_history(tag_id, post_id, note_id, user_id, direction) values (0, 7, null, 101, 1);




insert into vote_history(tag_id, post_id, note_id, user_id, direction) values (0, 2, 3, 100, 1);  --agreed with 2 (shown 3)
insert into vote_history(tag_id, post_id, note_id, user_id, direction) values (0, 1, 2, 100, -1); --changed mind after seeing 2
insert into vote_history(tag_id, post_id, note_id, user_id, direction) values (0, 1, 2, 100, 1);  --changed mind back (for no reason)
insert into vote_history(tag_id, post_id, note_id, user_id, direction) values (0, 1, 2, 100, -1); --changed mind again (for no reason)



insert into vote_history(tag_id, post_id, note_id, user_id, direction) values (0, 1, 2, 101, -1);

insert into vote_history(tag_id, post_id, note_id, user_id, direction) values (0, 1, 3, 101, -1);
insert into vote_history(tag_id, post_id, note_id, user_id, direction) values (0, 1, 3, 101, 1);
	                              `; 

	// Split the string into individual statements
	const statements = insertStatements.split(";\n").filter(statement => statement.trim() !== '');

	// Execute each statement
	for (const statement of statements) {
		// console.log("Executing", statement)
		await prisma.$executeRawUnsafe(statement.trim());
	}
}




seed()
	.catch(e => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
