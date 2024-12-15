import React, { useState } from 'react'
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
import { Toggle } from '#app/components/ui/toggle.tsx'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
  } from '#app/components/ui/select.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '#app/components/ui/collapsible.tsx'

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
const initialDefaultEmotion: Emotion = potentialEmotions[initialDefaultEmotionIndex] as Emotion

const emotionEmojis: Record<Emotion, string> = {
	anger: '😠',
	disgust: '🤢',
	fear: '😨',
	joy: '😊',
	sadness: '😢',
	surprise: '😲',
}

export interface Range {
	start: number
	end: number
}
export interface AnnotatedRange {
	emotions: Set<Emotion>
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

const initialText = 
	"Wie zerstört man die CDU? " +
	"Sie zerstört sich selbst. " +
	"Wie denn? " +
	"Sie wird ab 2025 eine Koalition mit den Grünen eingehen. " +
	"Es werden sehr sehr viele Leute, die von der Ampel enttäuscht sind, werden 2025 CDU wählen. " +
	"Sie werden sagen, AfD, naja, kann man denen das Land anvertrauen, " +
	"noch zu jung, vielleicht zu radikal, wählen wir doch mal den Merz, " +
	"der sieht so schön aus wie die alte Bundesrepublik. " +
	"Und dann wird Herr Merz regieren mit den Grünen. " +
	"Und die Politik von Schwarz -Grün wird im Wesentlichen dasselbe sein wie die Ampel. " +
	"Und dann werden wir 2029 erleben, dass viele Leute sagen, " +
	"wahrscheinlich geht es eben dann doch nur mit der AfD."

const initialAnnotations: Map<string, AnnotatedRange> = new Map<string, AnnotatedRange>([
	['0-641', { emotions: new Set(['surprise', 'fear']), range: { start: 0, end: 641 } }],
	['529-641', { emotions: new Set(['disgust', 'fear', 'sadness']), range: { start: 529, end: 641 } }],
])

const initialPublicAnnotations: Map<string, PublicAnnotatedRange> = new Map<string, PublicAnnotatedRange>([
	['0-641', { emotions: new Map([['surprise', 101], ['fear', 35]]), range: { start: 0, end: 641 } }],
	['529-641', { emotions: new Map([['disgust', 11], ['fear', 58], ['sadness', 71]]), range: { start: 529, end: 641 } }],
	['119-210', { emotions: new Map([['sadness', 20]]), range: { start: 119, end: 210 } }],
])

export default function OverviewPage() {
	const [annotations, setAnnotations] = useState<Map<string, AnnotatedRange>>(initialAnnotations)
	const [publicAnnotations, setPublicAnnotations] = useState<Map<string, PublicAnnotatedRange>>(initialPublicAnnotations)
	const [defaultEmotion, setDefaultEmotion] = useState<Emotion>(initialDefaultEmotion)
	const [text, setText] = useState<string>(initialText)

	const handleMouseUp = () => {
		const selection = window.getSelection()
		if (selection && selection.rangeCount > 0) {
			const range = selection.getRangeAt(0)
			const start = range.startOffset
			const end = range.endOffset
			if (start !== end) {
				const rangeKey = `${start}-${end}`
				const newAnnotation: AnnotatedRange = {
					emotions: new Set([defaultEmotion]),
					range: { start, end },
				}
				setAnnotations(new Map(annotations.set(rangeKey, newAnnotation)))
				const publicAnnotation: PublicAnnotatedRange = {
					emotions: new Map(Array.from(newAnnotation.emotions).map(emotion => [emotion, 1])),
					range: newAnnotation.range,
				}
				setPublicAnnotations(new Map(publicAnnotations.set(rangeKey, publicAnnotation)))
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
			if (annotation.emotions.has(emotion)) {
				annotation.emotions.delete(emotion)
			} else {
				annotation.emotions.add(emotion)
			}
			setAnnotations(new Map(newAnnotations))
		}
	}

	const handleCopyPublicAnnotation = (rangeKey: string) => {
		const publicAnnotation = publicAnnotations.get(rangeKey)
		if (publicAnnotation) {
			const newAnnotation: AnnotatedRange = {
				emotions: new Set(publicAnnotation.emotions.keys()),
				range: publicAnnotation.range,
			}
			setAnnotations(new Map(annotations.set(rangeKey, newAnnotation)))
		}
	}

	const numberOfRanges = annotations.size
	const numberOfUsedEmotions = new Set(
		Array.from(annotations.values()).flatMap(annotation => Array.from(annotation.emotions))
	).size

	return (
		<div>
			<div className="flex flex-col">
				<div className="mb-4 flex items-center">
					<div className="mr-2 px-4">
						<Markdown deactivateLinks={false}>
							{'## Emotion Annotation'}
						</Markdown>
						<p className="mt-2 mb-2">
							Default Emotion: 
							{potentialEmotions.map(emotion => (
								<Toggle
									className="ml-1 text-2xl"
									key={emotion}
									data-state={defaultEmotion === emotion ? 'on' : 'off'}
									onClick={() => setDefaultEmotion(emotion)}
								>
									{emotionEmojis[emotion]}
								</Toggle>
							))}
						</p>
						<p onMouseUp={handleMouseUp}>
							{text}
						</p>

						<Collapsible className="mt-4">
							<CollapsibleTrigger>
								<span className="mr-2">
									Your Annotations (Ranges: {numberOfRanges}, {numberOfUsedEmotions} emotions)
								</span>
								{potentialEmotions.map(emotion => (
									<span className="text-2xl" key={emotion}>
										{emotionEmojis[emotion]}
										<span className="mr-2 text-sm">
											{Array.from(annotations.values()).filter(annotation => annotation.emotions.has(emotion)).length}
										</span>
									</span>
								))}
							</CollapsibleTrigger>
							<CollapsibleContent>
								<ul>
									{Array.from(annotations.entries()).map(
										([rangeKey, annotation]) => (
											<li key={rangeKey}>
												<br/>
												<Markdown deactivateLinks={false}>
														{annotation.range.start === 0 && annotation.range.end === text.length
														? '**full post**'
														: '> ' + text.slice(annotation.range.start, annotation.range.end)}
												</Markdown>
												<p className="mt-1">
													{potentialEmotions.map(emotion => (
														<Toggle
															className="mr-1 text-2xl"
															key={emotion}
															data-state={annotation.emotions.has(emotion) ? 'on' : 'off'}
															onClick={() => handleToggleEmotion(rangeKey, emotion)}
														>
															{emotionEmojis[emotion]}
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
							<CollapsibleTrigger>
								Public Annotations
							</CollapsibleTrigger>
							<CollapsibleContent>
								<ul>
									{Array.from(publicAnnotations.entries()).map(
										([rangeKey, annotation]) => (
											<li key={rangeKey}>
												<br/>
												<Markdown deactivateLinks={false}>
														{annotation.range.start === 0 && annotation.range.end === text.length
														? '**full post**'
														: '> ' + text.slice(annotation.range.start, annotation.range.end)}
												</Markdown>
												<p className="mt-1">
													{Array.from(annotation.emotions.entries()).map(([emotion, count]) => (
														<span className="mr-1 text-2xl" key={emotion}>
															{emotionEmojis[emotion]}
															<span className="mr-2 text-sm">
																{count}
															</span>
														</span>
													))}
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
