import { conform, useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import {
	json,
	redirect,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from '@remix-run/node'
import {
	Form,
	useActionData,
	useLoaderData,
	useNavigation,
} from '@remix-run/react'
import * as QRCode from 'qrcode'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { z } from 'zod'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { db } from '#app/database/db.ts'
import { isCodeValid } from '#app/routes/_auth+/verify.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { validateCSRF } from '#app/utils/csrf.server.ts'
import { getDomainUrl, useIsPending } from '#app/utils/misc.tsx'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { getTOTPAuthUri } from '#app/utils/totp.server.ts'
import { type BreadcrumbHandle } from './profile.tsx'
import { twoFAVerificationType } from './profile.two-factor.tsx'

export const handle: BreadcrumbHandle & SEOHandle = {
	breadcrumb: <Icon name="check">Verify</Icon>,
	getSitemapEntries: () => null,
}

const CancelSchema = z.object({ intent: z.literal('cancel') })
const VerifySchema = z.object({
	intent: z.literal('verify'),
	code: z.string().min(6).max(6),
})

const ActionSchema = z.union([CancelSchema, VerifySchema])

export const twoFAVerifyVerificationType = '2fa-verify'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const verification = await db
		.selectFrom('Verification')
		.select(['id', 'algorithm', 'secret', 'period', 'digits'])
		.where('target', '=', userId)
		.where('type', '=', twoFAVerifyVerificationType)
		.executeTakeFirst()

	if (!verification) {
		return redirect('/settings/profile/two-factor')
	}
	const user = await db
		.selectFrom('User')
		.select('email')
		.where('id', '=', userId)
		.executeTakeFirstOrThrow()
	const issuer = new URL(getDomainUrl(request)).host
	const otpUri = getTOTPAuthUri({
		...verification,
		accountName: user.email,
		issuer,
	})
	const qrCode = await QRCode.toDataURL(otpUri)
	return json({ otpUri, qrCode })
}

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	await validateCSRF(formData, request.headers)

	const submission = await parse(formData, {
		schema: () =>
			ActionSchema.superRefine(async (data, ctx) => {
				if (data.intent === 'cancel') return null
				const codeIsValid = await isCodeValid({
					code: data.code,
					type: twoFAVerifyVerificationType,
					target: userId,
				})
				if (!codeIsValid) {
					ctx.addIssue({
						path: ['code'],
						code: z.ZodIssueCode.custom,
						message: `Invalid code`,
					})
					return z.NEVER
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

	switch (submission.value.intent) {
		case 'cancel': {
			await db
				.deleteFrom('Verification')
				.where('target', '=', userId)
				.where('type', '=', twoFAVerifyVerificationType)
				.execute()
			return redirect('/settings/profile/two-factor')
		}
		case 'verify': {
			await db
				.updateTable('Verification')
				.set({ type: twoFAVerificationType })
				.where('target', '=', userId)
				.where('type', '=', twoFAVerifyVerificationType)
				.execute()
			return redirectWithToast('/settings/profile/two-factor', {
				type: 'success',
				title: 'Enabled',
				description: 'Two-factor authentication has been enabled.',
			})
		}
	}
}

export default function TwoFactorRoute() {
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const navigation = useNavigation()

	const isPending = useIsPending()
	const pendingIntent = isPending ? navigation.formData?.get('intent') : null
	const lastSubmissionIntent = actionData?.submission.value?.intent

	const [form, fields] = useForm({
		id: 'verify-form',
		constraint: getFieldsetConstraint(ActionSchema),
		lastSubmission: actionData?.submission,
		onValidate({ formData }) {
			// otherwise, the best error zod gives us is "Invalid input" which is not
			// enough
			if (formData.get('intent') === 'cancel') {
				return parse(formData, { schema: CancelSchema })
			}
			return parse(formData, { schema: VerifySchema })
		},
	})

	return (
		<div>
			<div className="flex flex-col items-center gap-4">
				<img alt="qr code" src={data.qrCode} className="h-56 w-56" />
				<p>Scan this QR code with your authenticator app.</p>
				<p className="text-sm">
					If you cannot scan the QR code, you can manually add this account to
					your authenticator app using this code:
				</p>
				<div className="p-3">
					<pre
						className="whitespace-pre-wrap break-all text-sm"
						aria-label="One-time Password URI"
					>
						{data.otpUri}
					</pre>
				</div>
				<p className="text-sm">
					Once you've added the account, enter the code from your authenticator
					app below. Once you enable 2FA, you will need to enter a code from
					your authenticator app every time you log in or perform important
					actions. Do not lose access to your authenticator app, or you will
					lose access to your account.
				</p>
				<div className="flex w-full max-w-xs flex-col justify-center gap-4">
					<Form method="POST" {...form.props} className="flex-1">
						<AuthenticityTokenInput />
						<Field
							labelProps={{
								htmlFor: fields.code.id,
								children: 'Code',
							}}
							inputProps={{ ...conform.input(fields.code), autoFocus: true }}
							errors={fields.code.errors}
						/>

						<div className="min-h-[32px] px-4 pb-3 pt-1">
							<ErrorList id={form.errorId} errors={form.errors} />
						</div>

						<div className="flex justify-between gap-4">
							<StatusButton
								className="w-full"
								status={
									pendingIntent === 'verify'
										? 'pending'
										: lastSubmissionIntent === 'verify'
											? actionData?.status ?? 'idle'
											: 'idle'
								}
								type="submit"
								name="intent"
								value="verify"
							>
								Submit
							</StatusButton>
							<StatusButton
								className="w-full"
								variant="secondary"
								status={
									pendingIntent === 'cancel'
										? 'pending'
										: lastSubmissionIntent === 'cancel'
											? actionData?.status ?? 'idle'
											: 'idle'
								}
								type="submit"
								name="intent"
								value="cancel"
								disabled={isPending}
							>
								Cancel
							</StatusButton>
						</div>
					</Form>
				</div>
			</div>
		</div>
	)
}
