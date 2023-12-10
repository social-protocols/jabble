import { requireUserId } from '#app/utils/auth.server.ts';
import { Direction, vote } from "#app/vote.ts";
import { ActionFunctionArgs } from '@remix-run/node';

import assert from 'assert';


import { LocationType, type Location } from "#app/attention.ts";

import { z } from 'zod';
import { zfd } from 'zod-form-data';


const postIdSchema = z.coerce.number()
const noteIdSchema = z.coerce.number().optional()
const tagSchema = z.coerce.string()

// little hack described here: https://stackoverflow.com/questions/76797356/zod-nativeenum-type-checks-enums-value
const directionKeys = Object.keys(Direction) as [keyof typeof Direction]
const directionSchema = z.enum(directionKeys)

function parseDirection(directionString: FormDataEntryValue | undefined): Direction {
	const d: string = directionSchema.parse(directionString)
	console.log("Parsing string", d)

	// if d is a (possibly negative) integer
	if (/^-?\d+$/.test(d)) {
		// parse it as an int
		const i = parseInt(d)
		return i
	}

	// @ts-ignore: typescript doesn't know directionString is guaranteed to overlap with Direction
	return Direction[d]
}


function parseLocationType(locationTypeString: string): LocationType {

	console.log("In parseLocationType", locationTypeString)
	const d: string | undefined = randomLocationTypeSchema.parse(locationTypeString)
	assert(d !== undefined, `unrecognized location type {locationTypeString}`)

	// if d is a (possibly negative) integer
	if (/^-?\d+$/.test(d)) {
		// parse it as an int
		const i = parseInt(d)
		return i
	}

	// @ts-ignore: typescript doesn't know directionString is guaranteed to overlap with Direction
	return LocationType[d]
}


const locationTypeKeys = Object.keys(LocationType) as [keyof typeof LocationType]
const randomLocationTypeSchema = z.enum(locationTypeKeys).optional()

const oneBasedRankSchema = z.coerce.number().optional()
const voteSchema = zfd.formData({
	postId: postIdSchema,
	noteId: noteIdSchema,
	tag: tagSchema,
	direction: directionSchema,
	state: directionSchema,
	randomLocationType: randomLocationTypeSchema,
	oneBasedRank: oneBasedRankSchema,
});

export const action = async (args: ActionFunctionArgs) => {


	let request = args.request
	const formData = await request.formData();

	console.log("In vote action", formData)
	const parsedData = voteSchema.parse(formData);
	const direction: Direction = parseDirection(parsedData.direction)
	const state: Direction = parseDirection(parsedData.state)


	// First, interpret the user intent based on the button pressed **and** the current state.
	const newState = direction == state ? Direction.Neutral : direction

	const userId: string = await requireUserId(request)

	let location: Location | null = null

	console.log("Parsed data", parsedData)


	if (parsedData.randomLocationType !== undefined) {

		let oneBasedRank: number | null = parsedData.oneBasedRank === undefined ? null : parsedData.oneBasedRank 
		assert(oneBasedRank !== null, "oneBasedRank !== null")

		let locationTypeString = parsedData.randomLocationType
		console.log("Random locaiton type strinng", locationTypeString)
		location = {
			locationType: parseLocationType(locationTypeString),
			oneBasedRank: oneBasedRank,
		}
		console.log("Got location in vote action", parsedData.randomLocationType, parsedData.oneBasedRank, location)
	}

	const noteId = parsedData.noteId === undefined ? null : parsedData.noteId

	await vote(
		parsedData.tag,
		userId,
		parsedData.postId,
		noteId,
		newState,
		location,
	)

	return { state: newState, postId: parsedData.postId }
};
