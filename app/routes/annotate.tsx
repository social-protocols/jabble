import fs from 'fs/promises'
import path from 'path'
import { type LoaderFunction, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { useState, useEffect } from 'react'
import { Markdown } from '#app/components/markdown.tsx'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '#app/components/ui/collapsible.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Toggle } from '#app/components/ui/toggle.tsx'

// create type for emotion to be able to annotate text ranges with it
export type Emotion =
	| 'anger'
	| 'disgust'
	| 'fear'
	| 'joy'
	| 'sadness'
	| 'surprise'
const potentialEmotions: Emotion[] = [
	'anger',
	'disgust',
	'fear',
	'joy',
	'sadness',
	'surprise',
]
const initialDefaultEmotionIndex = 3
const initialDefaultEmotion: Emotion = potentialEmotions[
	initialDefaultEmotionIndex
] as Emotion

const emotionDetails: Record<
	Emotion,
	{ emoji: string; highlightColor: string; outlineColor: string }
> = {
	anger: {
		emoji: '😠',
		highlightColor: 'bg-red-900 bg-opacity-80',
		outlineColor: 'outline outline-red-500',
	},
	disgust: {
		emoji: '🤢',
		highlightColor: 'bg-green-900 bg-opacity-80',
		outlineColor: 'outline outline-green-500',
	},
	fear: {
		emoji: '😨',
		highlightColor: 'bg-purple-900 bg-opacity-80',
		outlineColor: 'outline outline-purple-500',
	},
	joy: {
		emoji: '😊',
		highlightColor: 'bg-yellow-900 bg-opacity-80',
		outlineColor: 'outline outline-yellow-500',
	},
	sadness: {
		emoji: '😢',
		highlightColor: 'bg-blue-900 bg-opacity-80',
		outlineColor: 'outline outline-blue-500',
	},
	surprise: {
		emoji: '😲',
		highlightColor: 'bg-pink-900 bg-opacity-80',
		outlineColor: 'outline outline-pink-500',
	},
}

export interface Range {
	start: number
	end: number
}
export interface AnnotatedRange {
	emotions: Emotion[]
	range: Range
}

export interface PublicAnnotatedRange {
	emotions: Map<Emotion, number>
	range: Range
}

export interface AnnotatedText {
	text: string
	annotations: AnnotatedRange[]
}

const initialPublicAnnotations: Map<string, PublicAnnotatedRange> = new Map<
	string,
	PublicAnnotatedRange
>([
	[
		'0-641',
		{
			emotions: new Map([
				['surprise', 101],
				['fear', 35],
			]),
			range: { start: 0, end: 641 },
		},
	],
	[
		'529-641',
		{
			emotions: new Map([
				['disgust', 11],
				['fear', 58],
				['sadness', 71],
			]),
			range: { start: 529, end: 641 },
		},
	],
	[
		'119-210',
		{ emotions: new Map([['sadness', 20]]), range: { start: 119, end: 210 } },
	],
])

export async function loadAnnotations() {
	const filePrefix = path.join(process.cwd(), 'public', '/speech/merz/')
	const annotationsFilePath = filePrefix + '/left-wing.json'
	const annotationsFileContents = await fs.readFile(
		annotationsFilePath,
		'utf-8',
	)
	const annotations = JSON.parse(annotationsFileContents) as AnnotatedRange[]

	const textFilePath = filePrefix + '/speech.txt'
	const textFileContents = await fs.readFile(textFilePath, 'utf-8')

	return { annotations, text: textFileContents }
}

export const loader: LoaderFunction = async () => {
	const { annotations, text } = await loadAnnotations()
	return json({ annotations, text })
}

const getHighlightColor = (emotion: Emotion) => {
	return emotionDetails[emotion].highlightColor
}

const getOutlineColor = (emotion: Emotion) => {
	return emotionDetails[emotion].outlineColor
}

export default function OverviewPage() {
	const data = useLoaderData<{ annotations: AnnotatedRange[]; text: string }>()
	const [annotations, setAnnotations] = useState<Map<string, AnnotatedRange>>(
		initializeAnnotations(data.annotations),
	)
	function initializeAnnotations(
		data: AnnotatedRange[],
	): Map<string, AnnotatedRange> {
		return new Map(
			data.map(annotation => [
				`${annotation.range.start}-${annotation.range.end}`,
				annotation,
			]),
		)
	}
	const [publicAnnotations, setPublicAnnotations] = useState<
		Map<string, PublicAnnotatedRange>
	>(initialPublicAnnotations)
	const [defaultEmotion, setDefaultEmotion] = useState<Emotion>(
		initialDefaultEmotion,
	)
	const [highlightedEmotion, setHighlightedEmotion] = useState<Emotion>(
		initialDefaultEmotion,
	)
	const [text, setText] = useState<string>(data.text)
	const [isPlaying, setIsPlaying] = useState<boolean>(true)
	const [isHighlighting, setIsHighlighting] = useState<boolean>(true)

	useEffect(() => {
		let interval: NodeJS.Timeout | undefined
		if (isPlaying && isHighlighting) {
			interval = setInterval(() => {
				setHighlightedEmotion(prevEmotion => {
					const currentIndex = potentialEmotions.indexOf(prevEmotion)
					const nextIndex = (currentIndex + 1) % potentialEmotions.length
					return potentialEmotions[nextIndex] || initialDefaultEmotion
				})
			}, 200)
		} else if (!isPlaying || !isHighlighting) {
			clearInterval(interval)
		}
		return () => clearInterval(interval)
	}, [isPlaying, isHighlighting])

	const handleMouseUp = () => {
		const selection = window.getSelection()
		if (selection && selection.rangeCount > 0) {
			const range = selection.getRangeAt(0)
			const start = range.startOffset
			const end = range.endOffset
			if (start !== end) {
				const rangeKey = `${start}-${end}`
				const newAnnotation: AnnotatedRange = {
					emotions: [defaultEmotion],
					range: { start, end },
				}
				setAnnotations(new Map(annotations.set(rangeKey, newAnnotation)))
				const publicAnnotation: PublicAnnotatedRange = {
					emotions: new Map([[defaultEmotion, 1]]),
					range: newAnnotation.range,
				}
				setPublicAnnotations(
					new Map(publicAnnotations.set(rangeKey, publicAnnotation)),
				)

				// Highlight the selected text
				const span = document.createElement('span')
				span.className = 'highlight'
				const contents = range.cloneContents()
				span.appendChild(contents)
				range.deleteContents()
				range.insertNode(span)
			}
		}
	}

	const handleDelete = (rangeKey: string) => {
		const newAnnotations = new Map(annotations)
		newAnnotations.delete(rangeKey)
		setAnnotations(newAnnotations)
	}

	const handleToggleEmotion = (rangeKey: string, emotion: Emotion) => {
		const newAnnotations = new Map(annotations)
		const annotation = newAnnotations.get(rangeKey)
		if (annotation) {
			const emotionIndex = annotation.emotions.indexOf(emotion)
			if (emotionIndex > -1) {
				annotation.emotions.splice(emotionIndex, 1)
			} else {
				annotation.emotions.push(emotion)
			}
			setAnnotations(new Map(newAnnotations))
		}
	}

	const handleCopyPublicAnnotation = (rangeKey: string) => {
		const publicAnnotation = publicAnnotations.get(rangeKey)
		if (publicAnnotation) {
			const newAnnotation: AnnotatedRange = {
				emotions: Array.from(publicAnnotation.emotions.keys()),
				range: publicAnnotation.range,
			}
			setAnnotations(new Map(annotations.set(rangeKey, newAnnotation)))
		}
	}

	const handleDefaultEmotionChange = (emotion: Emotion) => {
		setDefaultEmotion(emotion)
		setHighlightedEmotion(emotion)
	}

	const numberOfRanges = annotations.size
	const numberOfUsedEmotions = new Set(
		Array.from(annotations.values()).flatMap(annotation => annotation.emotions),
	).size

	const wordHeatmap = text.split(' ').map((word, index) => {
		const start = text.split(' ', index).join(' ').length + (index > 0 ? 1 : 0)
		const end = start + word.length
		let heat = 0

		annotations.forEach(annotation => {
			if (annotation.range.start <= end && annotation.range.end >= start) {
				heat += annotation.emotions.length
			}
		})

		publicAnnotations.forEach(publicAnnotation => {
			if (
				publicAnnotation.range.start <= end &&
				publicAnnotation.range.end >= start
			) {
				heat += Array.from(publicAnnotation.emotions.values()).reduce(
					(a, b) => a + b,
					0,
				)
			}
		})

		return { word, heat }
	})

	const getHeatColor = (heat: number) => {
		console.log(heat)
		if (heat > 250) return 'bg-red-600'
		if (heat > 138) return 'bg-red-500'
		if (heat > 0) return 'bg-red-400'
		return ''
	}

	return (
		<div>
			<div className="flex flex-col">
				<div className="mb-4 flex items-center">
					<div className="mr-2 px-4">
						<Markdown deactivateLinks={false}>
							{'## Emotion Annotation'}
						</Markdown>
						<p className="mb-2 mt-2">
							Default Emotion:
							{potentialEmotions.map(emotion => (
								<Toggle
									className={`ml-1 text-2xl ${highlightedEmotion === emotion ? getOutlineColor(emotion) : ''}`}
									key={emotion}
									data-state={defaultEmotion === emotion ? 'on' : 'off'}
									onClick={() => handleDefaultEmotionChange(emotion)}
								>
									{emotionDetails[emotion].emoji}
								</Toggle>
							))}
							<button className="ml-4" onClick={() => setIsPlaying(!isPlaying)}>
								{isPlaying ? 'Pause' : 'Play'}
							</button>
							<button
								className="ml-4"
								onClick={() => setIsHighlighting(!isHighlighting)}
							>
								{isHighlighting
									? 'Disable Highlighting'
									: 'Enable Highlighting'}
							</button>
						</p>
						<p onMouseUp={handleMouseUp}>
							{text.split(' ').map((word, index) => {
								const start =
									text.split(' ', index).join(' ').length + (index > 0 ? 1 : 0)
								const end = start + word.length
								const isHighlighted =
									isHighlighting &&
									Array.from(annotations.values()).some(
										annotation =>
											annotation.emotions.includes(highlightedEmotion) &&
											annotation.range.start <= end &&
											annotation.range.end >= start,
									)
								return (
									<span
										key={index}
										className={
											isHighlighted ? getHighlightColor(highlightedEmotion) : ''
										}
									>
										{word}{' '}
									</span>
								)
							})}
						</p>

						<Collapsible className="mt-4">
							<CollapsibleTrigger>
								<span className="mr-2">
									Your Annotations (Ranges: {numberOfRanges},{' '}
									{numberOfUsedEmotions} emotions)
								</span>
								{potentialEmotions.map(emotion => (
									<span className="text-2xl" key={emotion}>
										{emotionDetails[emotion].emoji}
										<span className="mr-2 text-sm">
											{
												Array.from(annotations.values()).filter(annotation =>
													annotation.emotions.includes(emotion),
												).length
											}
										</span>
									</span>
								))}
							</CollapsibleTrigger>
							<CollapsibleContent>
								<ul>
									{Array.from(annotations.entries()).map(
										([rangeKey, annotation]) => (
											<li key={rangeKey}>
												<br />
												<Markdown deactivateLinks={false}>
													{annotation.range.start === 0 &&
													annotation.range.end === text.length
														? '**full post**'
														: '> ' +
															text.slice(
																annotation.range.start,
																annotation.range.end,
															)}
												</Markdown>
												<p className="mt-1">
													{potentialEmotions.map(emotion => (
														<Toggle
															className="mr-1 text-2xl"
															key={emotion}
															data-state={
																annotation.emotions.includes(emotion)
																	? 'on'
																	: 'off'
															}
															onClick={() =>
																handleToggleEmotion(rangeKey, emotion)
															}
														>
															{emotionDetails[emotion].emoji}
														</Toggle>
													))}
													<button
														className="ml-1"
														onClick={() => handleDelete(rangeKey)}
													>
														<Icon name="trash" /> Disagree
													</button>
													{/* <span className="ml-1">	
														Range: {annotation.range.start} - {annotation.range.end}: 
													</span> */}
												</p>
											</li>
										),
									)}
								</ul>
							</CollapsibleContent>
						</Collapsible>

						<Collapsible className="mt-4">
							<CollapsibleTrigger>Public Annotations</CollapsibleTrigger>
							<CollapsibleContent>
								<ul>
									{Array.from(publicAnnotations.entries()).map(
										([rangeKey, annotation]) => (
											<li key={rangeKey}>
												<br />
												<Markdown deactivateLinks={false}>
													{annotation.range.start === 0 &&
													annotation.range.end === text.length
														? '**full post**'
														: '> ' +
															text.slice(
																annotation.range.start,
																annotation.range.end,
															)}
												</Markdown>
												<p className="mt-1">
													{Array.from(annotation.emotions.entries()).map(
														([emotion, count]) => (
															<span className="mr-1 text-2xl" key={emotion}>
																{emotionDetails[emotion].emoji}
																<span className="mr-2 text-sm">{count}</span>
															</span>
														),
													)}
													<button
														className="ml-1"
														onClick={() => handleCopyPublicAnnotation(rangeKey)}
													>
														<Icon name="pencil-2" /> Agree
													</button>
													{/* <span className="ml-1">	
														Range: {annotation.range.start} - {annotation.range.end}: 
													</span> */}
												</p>
											</li>
										),
									)}
								</ul>
							</CollapsibleContent>
						</Collapsible>
					</div>
				</div>
			</div>
		</div>
	)
}
