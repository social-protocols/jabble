import fs from 'fs/promises'
import path from 'path'
import { type LoaderFunction, json } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { Markdown } from '#app/components/markdown.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'

export interface Reference {
	title: string
	url: string
}

export interface Score {
	logos: number
	pathos: number
	ethos: number
}

export interface RhetoricalElement {
	title: string
	id?: string
	prev?: string
	next?: string
	category: string
	strikingExample: string
	akas: string[]
	description: string
	score: Score
	references: Reference[]
}

export async function loadRhetorics() {
	const filePath = path.join(process.cwd(), 'public', 'rhetorics.json')
	const fileContents = await fs.readFile(filePath, 'utf-8')
	const rhetorics = JSON.parse(fileContents) as RhetoricalElement[]
	const data = rhetorics.map((rhetoric, index) => {
		const prevIdx = (index + rhetorics.length - 1) % rhetorics.length
		const nextIdx = (index + 1) % rhetorics.length
		if (rhetorics[nextIdx] && rhetorics[prevIdx]) {
			rhetoric.prev = titleToSnakeCase(
				(rhetorics[prevIdx] as RhetoricalElement).title,
			)
			rhetoric.next = titleToSnakeCase(
				(rhetorics[nextIdx] as RhetoricalElement).title,
			)
			rhetoric.id = titleToSnakeCase(rhetoric.title)
			return rhetoric
		} else {
			throw new Error(
				'Invalid index, prevIdx was ' +
					prevIdx +
					' and nextIdx was ' +
					nextIdx +
					' and total length was ' +
					rhetorics.length +
					' for ' +
					index +
					' rhetorics[prevIdx] evaluated to ' +
					rhetorics[prevIdx] +
					' and rhetorics[nextIdx] evaluated to ' +
					rhetorics[nextIdx],
			)
		}
	})
	return json(data)
}

export const loader: LoaderFunction = async () => {
	return await loadRhetorics()
}

function titleToSnakeCase(title: string) {
	return title.toLowerCase().replace(/\s/g, '-')
}

export default function OverviewPage() {
	const data = useLoaderData<RhetoricalElement[]>()

	return (
		<div>
			<div className="flex flex-col">
				<div className="mb-4 flex items-center">
					<div className="mr-2 px-4">
						<Markdown deactivateLinks={false}>
							{'## Rhetorical Elements'}
						</Markdown>
						<p>
							If you are free of guilt so throw the first stone. Bad rhetorics
							are everywhere. Make yourself aware of them. Some groups use them
							more than others. Once you know them, you can spot them. Make
							others accountable for their rhetorics. Even yourself.
						</p>
					</div>
				</div>
			</div>

			<div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
				{data.map((element: RhetoricalElement, index: number) => (
					<div key={index} className="flex items-center">
						<Link to={`/rhetoric/${element.id}`}>
							<Card>
								<CardHeader>
									<CardTitle>{element.title}</CardTitle>
								</CardHeader>
								<CardContent>
									<CardDescription>{element.description}</CardDescription>
								</CardContent>
							</Card>
						</Link>
					</div>
				))}
			</div>
		</div>
	)
}

interface Point {
	x: number
	y: number
}

interface EnhancedScoreValue {
	value: number
	angle: number
	base: Point
	outer: Point
	point: Point
	textPos: Point
	text: string
	abbreviation: string
	description: string
}

function createSpiderDiagram(size: number, score: Score) {
	const center = size / 2
	const radiusText = center - 5
	const radius = radiusText * 0.9
	const keys = Object.keys(score)
	const total = keys.length
	function enhance(
		value: number,
		pos: number,
		text: string,
		description: string,
	): EnhancedScoreValue {
		const scale = value / 10
		const angle = (2 * Math.PI * pos) / total
		const baseX = Math.cos(angle)
		const baseY = Math.sin(angle)
		return {
			value,
			angle,
			text,
			abbreviation: text[0] ?? '',
			description,
			base: {
				x: baseX,
				y: baseY,
			},
			outer: {
				x: center + baseX * radius,
				y: center + baseY * radius,
			},
			point: {
				x: center + baseX * radius * scale,
				y: center + baseY * radius * scale,
			},
			textPos: {
				x: center + baseX * radiusText,
				y: center + baseY * radiusText,
			},
		}
	}
	const enhancedScore = {
		logos: enhance(
			score.logos,
			0,
			'Logos',
			'Try to convince through logic and evidence, appealing to reason.',
		),
		pathos: enhance(
			score.pathos,
			1,
			'Pathos',
			'Try to convince through emotions, appealing to feelings and values.',
		),
		ethos: enhance(
			score.ethos,
			2,
			'Ethos',
			'Try to convince through credibility, appealing to trust and authority.',
		),
	}
	const points = Object.values(enhancedScore)
		.map(s => `${s.point.x},${s.point.y}`)
		.join(' ')

	return (
		<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
			<circle
				cx={center}
				cy={center}
				r={radius}
				stroke="gray"
				strokeWidth="1"
				fill="none"
			/>
			<circle
				cx={center}
				cy={center}
				r={radius / 2}
				stroke="gray"
				strokeWidth="1"
				fill="none"
			/>
			{Object.values(enhancedScore).map((s, index) => (
				<line
					key={index}
					x1={center}
					y1={center}
					x2={s.outer.x}
					y2={s.outer.y}
					stroke="gray"
					strokeWidth="1"
				/>
			))}
			<polygon
				points={points}
				fill="rgba(128, 128, 255, 0.8)"
				stroke="blue"
				strokeWidth="1"
			/>
			{Object.values(enhancedScore).map((s, index) => (
				<text
					key={index}
					x={s.textPos.x}
					y={s.textPos.y}
					textAnchor="middle"
					dy="5"
					fill="white"
				>
					<title>
						{s.text}: {s.description}
					</title>
					{s.abbreviation}
				</text>
			))}
		</svg>
	)
}

export function RhetoricalElementDetail(element: RhetoricalElement) {
	return (
		<Card className="rounded-lg p-6 shadow-md">
			<div className="mb-6 flex flex-row items-start justify-between">
				<div className="flex-1">
					<CardTitle className="mb-2 text-2xl font-bold">
						{element.title}
					</CardTitle>
					<p className="text-sm text-gray-400">
						<strong>Category:</strong> {element.category}
					</p>
					<p className="text-sm text-gray-400">
						<strong>Also known as:</strong> {element.akas.join(', ')}
					</p>
					<p className="text-sm text-gray-400">
						<strong>Logos:</strong> {element.score.logos}
						<strong className="pl-2">Pathos:</strong> {element.score.pathos}
						<strong className="pl-2">Ethos:</strong> {element.score.ethos}
					</p>
				</div>

				<div className="ml-4 flex-shrink-0">
					{createSpiderDiagram(100, element.score)}
				</div>
			</div>

			<div className="mb-6">
				<blockquote className="mb-4 border-l-4 border-gray-300 pl-4 text-lg">
					{element.strikingExample}
				</blockquote>
				<p className="mb-4 text-lg">{element.description}</p>
			</div>

			<div>
				<h2 className="mb-2 text-xl font-semibold">References</h2>
				<ul className="list-inside list-disc">
					{element.references.map((ref, index) => (
						<li key={index} className="text-lg">
							<a
								href={ref.url}
								rel="noopener noreferrer"
								className="hover:underline"
							>
								{ref.title}
							</a>
						</li>
					))}
				</ul>
			</div>

			<div className="mt-6 flex justify-between">
				<Link
					to={`/rhetoric/${element.prev}`}
					className="text-blue-500 hover:underline"
				>
					Previous
				</Link>
				<Link
					to={`/rhetoric/${element.next}`}
					className="text-blue-500 hover:underline"
				>
					Next
				</Link>
			</div>
		</Card>
	)
}
