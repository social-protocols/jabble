import { relativeEntropy } from '#app/utils/entropy.ts'

export function StatsPostAnnotation({ annotation }: { annotation: string }) {
	return (
		<p style={{ color: 'grey', fontSize: '0.7rem', marginBottom: '10px' }}>
			{annotation}
		</p>
	)
}

export function StatsInformedRatioChange({
	informedProb,
	uninformedProb,
}: {
	informedProb: number
	uninformedProb: number
}) {
	const informedProbPercentage = (informedProb * 100).toFixed(1)
	const uninformedProbPercentage = (uninformedProb * 100).toFixed(1)

	const informedColor =
		informedProb - uninformedProb >= 0 ? 'text-green-500' : 'text-red-500'

	return (
		<p>
			<span style={{ textDecoration: 'line-through', color: 'grey' }}>
				{uninformedProbPercentage}%
			</span>
			<span className={informedColor}> {informedProbPercentage}%</span>
		</p>
	)
}

export function EffectStrengthConnectorLine({
	informedProb,
	uninformedProb,
}: {
	informedProb: number
	uninformedProb: number
}) {
	const effectStrength = relativeEntropy(informedProb, uninformedProb)

	const borderWidth =
		effectStrength > 0.1
			? effectStrength > 0.5
				? 'border-l-8'
				: 'border-l-4'
			: 'border-l-2'

	const upvoteRatioChange = informedProb - uninformedProb

	const effectDescription =
		upvoteRatioChange! >= 0
			? 'causes people to upvote more'
			: 'causes people to upvote less'

	return (
		<div
			className={borderWidth + ' mx-5 my-2 h-10 border-gray-500 p-2 text-sm'}
		>
			{effectDescription}
		</div>
	)
}
