import { prisma } from '#app/utils/db.server.ts'
import * as fs from 'fs';
import * as path from 'path';

import { fileURLToPath } from 'url';
async function seed() {

	// since prisma provides the cuid() function (not supported by sqlite), we use prisma statements instead of sql to create users
	// insert into user(idInt, username, email) values (100, "user100", "user100@test.com");
	// insert into user(idInt, username, email) values (101, "user101", "user101@test.com");
	await prisma.user.create({
		data: { id: '100', username: 'user100', email: 'user100@test.com' },
	})
	await prisma.user.create({
		data: { id: '101', username: 'user101', email: 'user101@test.com' },
	})

	const insertStatements = fs.readFileSync('sql/seed.sql', 'utf8');

	// First, remove inline comments that are on the same line as a semicolon
	const cleanedStatements = insertStatements.replace(/\s*--.*?(?:\n|\Z)/g, ';\n');

	// Then split the cleaned string into individual statements
	const statements = cleanedStatements.split(";\n")
		.map(statement => statement.trim())
		.filter(statement => statement !== '');

	// Execute each statement
	for (const statement of statements) {
		// console.log("Executing", statement)
		await prisma.$executeRawUnsafe(statement.trim())
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
