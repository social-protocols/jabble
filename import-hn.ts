import assert from 'assert'
import * as fs from 'fs'
import zlib from 'zlib'
import * as cliProgress from 'cli-progress'
import { glob } from 'glob'
import TurndownService from 'turndown'
import { db } from '#app/db.ts'
import { createPost } from '#app/post.ts'

const turndownService = new TurndownService({ emDelimiter: '*' })

export async function importHN() {
	let patterns = process.argv.slice(2)
	assert(patterns, 'Missing filename arguments')

	const files = await glob(patterns, {})
	files.forEach(file => {
		importHNPostsFromFile(file)
	})
}

async function importHNPostsFromFile(filename: string) {
	await readJsonLinesFromFile(filename)
		.then(async items => {
			const bar1 = new cliProgress.SingleBar(
				{},
				cliProgress.Presets.shades_classic,
			)
			console.log(filename, items.length)
			bar1.start(items.length, 0)

			let idMap = new Map<string, number>()
			let i = 0
			for (let item of items) {
				let parentId: number | null = null
				if (item.parent !== null && item.parent !== 0) {
					parentId = idMap.get(item.parent) || null
					if (parentId == null) {
						throw new Error('Parent id not found', item.parent)
					}
				}
				const by = item.by
				const ourUserId = 'hn:' + by
				await db
					.insertInto('User')
					.values({
						id: ourUserId,
						username: by,
						email: 'hn-user' + by + '@test.com',
						isAdmin: 0,
						// password: "passw0rd"
						// password: "createPassword("user" + i)"
					})
					.onConflict(oc => oc.column('id').doNothing())
					.execute()

				const htmlString = item.text
				let markdown = turndownService.turndown(htmlString)

				if (item.title) {
					if (item.url) {
						markdown = `# [${item.title}](${item.url})\n\n${markdown}`
					} else {
						markdown = `# ${item.title}\n\n${markdown}`
					}
				}

				const postId = await db.transaction().execute(
					async trx =>
						await createPost(trx, parentId, markdown, ourUserId, {
							isPrivate: false,
							withUpvote: true,
						}),
				)

				idMap.set(item.id, postId)
				bar1.update(++i)
			}
			bar1.stop()
		})
		.catch(error => {
			console.error('Error:', error)
		})
}

async function readJsonLinesFromFile(filePath: string): Promise<any[]> {
	return await new Promise((resolve, reject) => {
		const gunzip = zlib.createGunzip()
		let readStream = filePath.endsWith('.gz')
			? fs.createReadStream(filePath).pipe(gunzip)
			: fs.createReadStream(filePath, { encoding: 'utf-8' })

		const jsonObjects: any[] = []
		let partialLine = ''

		readStream.on('data', chunk => {
			const lines = (partialLine + chunk).split('\n')
			partialLine = lines.pop() || '' // Handle incomplete last line

			lines.forEach(line => {
				if (line.trim()) {
					try {
						jsonObjects.push(JSON.parse(line))
					} catch (error) {
						reject(new Error(`Invalid JSON in file: ${line}`))
					}
				}
			})
		})

		readStream.on('end', () => {
			if (partialLine.trim()) {
				try {
					jsonObjects.push(JSON.parse(partialLine))
				} catch (error) {
					reject(new Error(`Invalid JSON in file: ${partialLine}`))
				}
			}
			resolve(jsonObjects)
		})

		readStream.on('error', error => {
			reject(error)
		})
	})
}

importHN()
