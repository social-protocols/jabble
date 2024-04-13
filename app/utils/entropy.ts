export function relativeEntropy(p: number, q: number): number {
	const logp = p == 0 ? 0 : Math.log2(p)
	const lognotp = p == 1 ? 0 : Math.log2(1 - p)
	const logq = q == 0 ? 0 : Math.log2(q)
	const lognotq = q == 1 ? 0 : Math.log2(1 - q)

	// console.log(p, q, logp, lognotp, logq, lognotq)
	const e = p * (logp - logq) + (1 - p) * (lognotp - lognotq)
	return e
}
