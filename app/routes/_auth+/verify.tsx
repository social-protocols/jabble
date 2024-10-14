import { conform, type Submission, useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import cuid2 from '@paralleldrive/cuid2'
import { json, type ActionFunctionArgs } from '@remix-run/node'
import { Form, useActionData, useSearchParams } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { db } from '#app/database/db.ts'
import { handleVerification as handleChangeEmailVerification } from '#app/routes/settings+/profile.change-email.tsx'
import { twoFAVerificationType } from '#app/routes/settings+/profile.two-factor.tsx'
import { type twoFAVerifyVerificationType } from '#app/routes/settings+/profile.two-factor.verify.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { validateCSRF } from '#app/utils/csrf.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { ensurePrimary } from '#app/utils/litefs.server.ts'
import { getDomainUrl, useIsPending } from '#app/utils/misc.tsx'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { generateTOTP, verifyTOTP } from '#app/utils/totp.server.ts'
import {
	handleVerification as handleLoginTwoFactorVerification,
	shouldRequestTwoFA,
} from './login.tsx'
import { handleVerification as handleOnboardingVerification } from './onboarding.tsx'
import { handleVerification as handleResetPasswordVerification } from './reset-password.tsx'

export const codeQueryParam = 'code'
export const targetQueryParam = 'target'
export const typeQueryParam = 'type'
export const redirectToQueryParam = 'redirectTo'
const types = ['onboarding', 'reset-password', 'change-email', '2fa'] as const
const VerificationTypeSchema = z.enum(types)
export type VerificationTypes = z.infer<typeof VerificationTypeSchema>

const VerifySchema = z.object({
	[codeQueryParam]: z.string().min(6).max(6),
	[typeQueryParam]: VerificationTypeSchema,
	[targetQueryParam]: z.string(),
	[redirectToQueryParam]: z.string().optional(),
})

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)
	return validateRequest(request, formData)
}

export function getRedirectToUrl({
	request,
	type,
	target,
	redirectTo,
}: {
	request: Request
	type: VerificationTypes
	target: string
	redirectTo?: string
}) {
	const redirectToUrl = new URL(`${getDomainUrl(request)}/verify`)
	redirectToUrl.searchParams.set(typeQueryParam, type)
	redirectToUrl.searchParams.set(targetQueryParam, target)
	if (redirectTo) {
		redirectToUrl.searchParams.set(redirectToQueryParam, redirectTo)
	}
	return redirectToUrl
}

export async function requireRecentVerification(request: Request) {
	const userId = await requireUserId(request)
	const shouldReverify = await shouldRequestTwoFA(request)
	if (shouldReverify) {
		const reqUrl = new URL(request.url)
		const redirectUrl = getRedirectToUrl({
			request,
			target: userId,
			type: twoFAVerificationType,
			redirectTo: reqUrl.pathname + reqUrl.search,
		})
		throw await redirectWithToast(redirectUrl.toString(), {
			title: 'Please Reverify',
			description: 'Please reverify your account before proceeding',
		})
	}
}

export async function prepareVerification({
	period,
	request,
	type,
	target,
}: {
	period: number
	request: Request
	type: VerificationTypes
	target: string
}) {
	const verifyUrl = getRedirectToUrl({ request, type, target })
	const redirectTo = new URL(verifyUrl.toString())

	const { otp, ...verificationConfig } = generateTOTP({
		algorithm: 'SHA256',
		// Leaving off 0 and O on purpose to avoid confusing users.
		charSet: 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789',
		period,
	})
	const verificationData = {
		id: cuid2.createId(),
		type,
		target,
		...verificationConfig,
		expiresAt: new Date(
			Date.now() + verificationConfig.period * 1000,
		).valueOf(),
	}
	console.log('Inserting verification data', verificationData)
	await db
		.insertInto('Verification')
		.values(verificationData)
		.onConflict(oc =>
			oc.columns(['target', 'type']).doUpdateSet(verificationData),
		)
		.execute()

	// add the otp to the url we'll email the user.
	verifyUrl.searchParams.set(codeQueryParam, otp)

	return { otp, redirectTo, verifyUrl }
}

export type VerifyFunctionArgs = {
	request: Request
	submission: Submission<z.infer<typeof VerifySchema>>
	body: FormData | URLSearchParams
}

export async function isCodeValid({
	code,
	type,
	target,
}: {
	code: string
	type: VerificationTypes | typeof twoFAVerifyVerificationType
	target: string
}) {
	const verification = await db
		.selectFrom('Verification') // Replace with your actual table name if different
		.select(['algorithm', 'secret', 'period', 'charSet']) // Select the fields you're interested in
		.where('target', '=', target) // Replace 'type' with the actual column name for 'target'
		.where('type', '=', type) // Replace 'type' with the actual column name for 'type'
		.where(eb =>
			eb.or([
				eb('expiresAt', '>', new Date().valueOf()),
				eb('expiresAt', 'is', null),
			]),
		)
		.executeTakeFirst()

	console.log('Query', type, target, new Date().valueOf(), verification)

	if (!verification) return false
	const result = verifyTOTP({
		otp: code,
		...verification,
	})
	if (!result) return false

	return true
}

async function validateRequest(
	request: Request,
	body: URLSearchParams | FormData,
) {
	const submission = await parse(body, {
		schema: VerifySchema.superRefine(async (data, ctx) => {
			const codeIsValid = await isCodeValid({
				code: data[codeQueryParam],
				type: data[typeQueryParam],
				target: data[targetQueryParam],
			})
			if (!codeIsValid) {
				ctx.addIssue({
					path: ['code'],
					code: z.ZodIssueCode.custom,
					message: `Invalid code`,
				})
				return
			}
		}),
		async: true,
	})

	if (submission.intent !== 'submit') {
		return json({ status: 'idle', submission } as const)
	}
	if (!submission.value) {
		return json({ status: 'error', submission } as const, { status: 400 })
	}

	// this code path could be part of a loader (GET request), so we need to make
	// sure we're running on primary because we're about to make writes.
	await ensurePrimary()

	const { value: submissionValue } = submission

	async function deleteVerification() {
		await db
			.deleteFrom('Verification')
			.where('type', '=', submissionValue[typeQueryParam])
			.where('target', '=', submissionValue[targetQueryParam])
			.execute()
	}

	switch (submissionValue[typeQueryParam]) {
		case 'reset-password': {
			await deleteVerification()
			return handleResetPasswordVerification({ request, body, submission })
		}
		case 'onboarding': {
			await deleteVerification()
			return handleOnboardingVerification({ request, body, submission })
		}
		case 'change-email': {
			await deleteVerification()
			return handleChangeEmailVerification({ request, body, submission })
		}
		case '2fa': {
			return handleLoginTwoFactorVerification({ request, body, submission })
		}
	}
}

export default function VerifyRoute() {
	const [searchParams] = useSearchParams()
	const isPending = useIsPending()
	const actionData = useActionData<typeof action>()
	const parsedType = VerificationTypeSchema.safeParse(
		searchParams.get(typeQueryParam),
	)
	const type = parsedType.success ? parsedType.data : null

	const checkEmail = (
		<>
			<h1 className="mb-6 text-2xl md:text-h1">Check your email</h1>
			<p className="text-body-md text-muted-foreground">
				We've sent you a code to verify your email address.
			</p>
		</>
	)

	const headings: Record<VerificationTypes, React.ReactNode> = {
		onboarding: checkEmail,
		'reset-password': checkEmail,
		'change-email': checkEmail,
		'2fa': (
			<>
				<h1 className="text-h1">Check your 2FA app</h1>
				<p className="mt-3 text-body-md text-muted-foreground">
					Please enter your 2FA code to verify your identity.
				</p>
			</>
		),
	}

	const [form, fields] = useForm({
		id: 'verify-form',
		constraint: getFieldsetConstraint(VerifySchema),
		lastSubmission: actionData?.submission,
		onValidate({ formData }) {
			return parse(formData, { schema: VerifySchema })
		},
		defaultValue: {
			code: searchParams.get(codeQueryParam) ?? '',
			type,
			target: searchParams.get(targetQueryParam) ?? '',
			redirectTo: searchParams.get(redirectToQueryParam) ?? '',
		},
	})

	return (
		<main className="container flex flex-col justify-center pb-32 md:pt-20">
			<div className="mb-[16px] text-center md:mb-[64px]">
				{type ? headings[type] : 'Invalid Verification Type'}
			</div>

			<div className="mx-auto flex w-72 max-w-full flex-col justify-center">
				<div>
					<ErrorList errors={form.errors} id={form.errorId} />
				</div>
				<div className="flex w-full">
					<Form method="POST" {...form.props} className="flex-1">
						<AuthenticityTokenInput />
						<HoneypotInputs />
						<Field
							labelProps={{
								htmlFor: fields[codeQueryParam].id,
								children: 'Code',
							}}
							inputProps={conform.input(fields[codeQueryParam])}
							errors={fields[codeQueryParam].errors}
						/>
						<input
							{...conform.input(fields[typeQueryParam], { type: 'hidden' })}
						/>
						<input
							{...conform.input(fields[targetQueryParam], { type: 'hidden' })}
						/>
						<input
							{...conform.input(fields[redirectToQueryParam], {
								type: 'hidden',
							})}
						/>
						<StatusButton
							className="w-full"
							status={isPending ? 'pending' : actionData?.status ?? 'idle'}
							type="submit"
							disabled={isPending}
						>
							Submit
						</StatusButton>
					</Form>
				</div>
			</div>
		</main>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
