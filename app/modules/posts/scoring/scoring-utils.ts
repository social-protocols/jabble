import { type Effect } from '../post-types.ts'

export function snakeToCamelCase(str: string): string {
	return str.replace(/([-_][a-z])/g, group =>
		group.toUpperCase().replace('-', '').replace('_', ''),
	)
}

export function snakeToCamelCaseObject(obj: any): any {
	if (obj instanceof Array) {
		return obj.map(v => snakeToCamelCaseObject(v))
	} else if (obj !== null && obj.constructor === Object) {
		return Object.keys(obj).reduce((result, key) => {
			result[snakeToCamelCase(key)] = snakeToCamelCaseObject(obj[key])
			return result
		}, {} as any)
	}
	return obj
}

export function camelToSnakeCase(str: string): string {
	return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

export function relativeEntropy(p: number, q: number): number {
	const logp = p == 0 ? 0 : Math.log2(p)
	const lognotp = p == 1 ? 0 : Math.log2(1 - p)
	const logq = q == 0 ? 0 : Math.log2(q)
	const lognotq = q == 1 ? 0 : Math.log2(1 - q)

	// console.log(p, q, logp, lognotp, logq, lognotq)
	const e = p * (logp - logq) + (1 - p) * (lognotp - lognotq)
	return e
}

export function effectSizeOnTarget(effectOnTarget: Effect | null): number {
	const targetP = effectOnTarget?.p ?? 0
	const targetQ = effectOnTarget?.q ?? 0
	const targetPSize = effectOnTarget?.pSize ?? 0
	return relativeEntropy(targetP, targetQ) * targetPSize
}
