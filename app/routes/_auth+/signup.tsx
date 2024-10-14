import { conform, useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import * as E from '@react-email/components'
import {
	json,
	type MetaFunction,
	redirect,
	type ActionFunctionArgs,
} from '@remix-run/node'
import { Form, Link, useActionData } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { db } from '#app/database/db.ts'
import { SITE_NAME } from '#app/site.ts'
import { validateCSRF } from '#app/utils/csrf.server.ts'
import { sendEmail } from '#app/utils/email.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { useIsPending } from '#app/utils/misc.tsx'
import { EmailSchema } from '#app/utils/user-validation.ts'
import { prepareVerification } from './verify.tsx'

const SignupSchema = z.object({
	email: EmailSchema,
})

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()

	await validateCSRF(formData, request.headers)
	checkHoneypot(formData)

	const submission = await parse(formData, {
		schema: SignupSchema.superRefine(async (data, ctx) => {
			const existingUser = await db
				.selectFrom('User')
				.select('id')
				.where('email', '=', data.email)
				.executeTakeFirst()
			if (existingUser) {
				ctx.addIssue({
					path: ['email'],
					code: z.ZodIssueCode.custom,
					message: 'A user already exists with this email',
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
	const { email } = submission.value
	const { verifyUrl, redirectTo, otp } = await prepareVerification({
		period: 10 * 60,
		request,
		type: 'onboarding',
		target: email,
	})

	const response = await sendEmail({
		to: email,
		subject: `Welcome to ${SITE_NAME}!`,
		react: <SignupEmail onboardingUrl={verifyUrl.toString()} otp={otp} />,
	})

	if (response.status === 'success') {
		return redirect(redirectTo.toString())
	} else {
		submission.error[''] = [response.error.message]
		return json({ status: 'error', submission } as const, { status: 500 })
	}
}

export function SignupEmail({
	onboardingUrl,
	otp,
}: {
	onboardingUrl: string
	otp: string
}) {
	return (
		<E.Html lang="en" dir="ltr">
			<E.Container>
				<h1>
					<E.Text>Welcome to {SITE_NAME}!</E.Text>
				</h1>
				<p>
					<E.Text>
						Here's your verification code: <strong>{otp}</strong>
					</E.Text>
				</p>
				<p>
					<E.Text>Or click the link to get started:</E.Text>
				</p>
				<E.Link href={onboardingUrl}>{onboardingUrl}</E.Link>
			</E.Container>
		</E.Html>
	)
}

export const meta: MetaFunction = () => {
	return [{ title: 'Sign Up | ' + SITE_NAME }]
}

export default function SignupRoute() {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()

	const [form, fields] = useForm({
		id: 'signup-form',
		constraint: getFieldsetConstraint(SignupSchema),
		lastSubmission: actionData?.submission,
		onValidate({ formData }) {
			const result = parse(formData, { schema: SignupSchema })
			return result
		},
		shouldRevalidate: 'onBlur',
	})

	return (
		<div className="pt-15 container flex flex-col justify-center pb-32 md:pt-20">
			<div className="mb-[16px] space-y-5 text-center sm:space-y-10 md:mb-[64px]">
				<h1 className="text-xl font-bold md:text-h1">Welcome to Jabble!</h1>
			</div>
			<div className="mx-auto mt-6 min-w-[268px] max-w-sm">
				<Form method="POST" {...form.props}>
					<AuthenticityTokenInput />
					<HoneypotInputs />
					<Field
						labelProps={{
							htmlFor: fields.email.id,
							children: 'Email',
						}}
						inputProps={{ ...conform.input(fields.email), autoFocus: true }}
						errors={fields.email.errors}
					/>
					<div className="mb-4">
						We will use your email only for account-related purposes and don't
						give it to any third-parties.
						<br />
						<br />
						By signing up, you agree to our{' '}
						<Link className="underline" to="/privacy">
							Privacy Policy
						</Link>{' '}
						and{' '}
						<Link className="underline" to="/tos">
							Terms of Service
						</Link>
						.
					</div>
					<ErrorList errors={form.errors} id={form.errorId} />
					<StatusButton
						className="w-full"
						status={isPending ? 'pending' : actionData?.status ?? 'idle'}
						type="submit"
						disabled={isPending}
					>
						Sign Up
					</StatusButton>
				</Form>
			</div>
		</div>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
