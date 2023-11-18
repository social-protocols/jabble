import { prisma } from '#app/utils/db.server.ts'
// import { cleanupDb, createPassword, createUser } from '#tests/db-utils.ts'

async function seed() {
	console.log('🌱 Seeding...')
	console.time(`🌱 Database has been seeded`)

	console.time('🧹 Cleaned up the database...')
	// await cleanupDb(prisma)
	console.timeEnd('🧹 Cleaned up the database...')

	if (process.env.MINIMAL_SEED) {
		console.log('👍 Minimal seed complete')
		console.timeEnd(`🌱 Database has been seeded`)
		return
	}

	await prisma.user.create({
		select: { id: true },
		data: {
			email: 'user1@nowhere.dev',
			username: 'user1',
			name: 'User 1',
			// password: { create: createPassword('kodylovesyou') },
			id: 100,
			posts: {
				create: [
					{
						id: 1,
						content:
							'So, pregnant people can\’t cross state lines to get abortions but guys like Kyle Rittenhouse can cross state lines to murder people. Seems fair.',
					},
				],
			},
		},
	})

	await prisma.user.create({
		select: { id: true },
		data: {
			email: 'user2@nowhere.dev',
			username: 'user2',
			name: 'User 2',
			// password: { create: createPassword('kodylovesyou') },
			id: 101,
			posts: {
				create: [
					{
						id: 2,
						content:
							'Kyle Rittenhouse was acquitted of murder charges. Clear video evidence showed he acted in self defense.',
						parentId: 1,
					},
				],
			},
		},
	})


	console.timeEnd(`🌱 Database has been seeded`)
}

seed()
	.catch(e => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
