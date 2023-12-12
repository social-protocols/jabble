// sum.test.js
import { expect, test } from 'vitest'
import { informedProbability } from './probabilities.ts'

test('calculate informedProbability', async () => {
	expect(await informedProbability('global', 1)).toBe(0.9128787878787878)
})
