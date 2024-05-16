import { type SEOHandle } from '@nasa-gcn/remix-seo'
import cuid2 from '@paralleldrive/cuid2'
import {
	json,
	redirect,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from '@remix-run/node'
import { Link, useFetcher, useLoaderData } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { db } from '#app/db.ts'
import { requireUserId } from '#app/utils/auth.server.ts'
import { validateCSRF } from '#app/utils/csrf.server.ts'
import { generateTOTP } from '#app/utils/totp.server.ts'
import { twoFAVerificationType } from './profile.two-factor.tsx'
import { twoFAVerifyVerificationType } from './profile.two-factor.verify.tsx'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const verification = db
		.selectFrom('Verification')
		.select('id')
		.where('target', '=', userId)
		.where('type', '=', twoFAVerificationType)
		.executeTakeFirst()
	return json({ is2FAEnabled: Boolean(verification) })
}

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	await validateCSRF(await request.formData(), request.headers)
	const { otp: _otp, ...config } = generateTOTP()
	const verificationData = {
		id: cuid2.createId(),
		...config,
		type: twoFAVerifyVerificationType,
		target: userId,
	}
	await db
		.insertInto('Verification')
		.values(verificationData)
		.onConflict(oc =>
			oc.columns(['target', 'type']).doUpdateSet(verificationData),
		)
		.execute()
	return redirect('/settings/profile/two-factor/verify')
}

export default function TwoFactorRoute() {
	const data = useLoaderData<typeof loader>()
	const enable2FAFetcher = useFetcher<typeof action>()

	return (
		<div className="flex flex-col gap-4">
			{data.is2FAEnabled ? (
				<>
					<p className="text-lg">
						<Icon name="check">
							You have enabled two-factor authentication.
						</Icon>
					</p>
					<Link to="disable">
						<Icon name="lock-open-1">Disable 2FA</Icon>
					</Link>
				</>
			) : (
				<>
					<p>
						<Icon name="lock-open-1">
							You have not enabled two-factor authentication yet.
						</Icon>
					</p>
					<p className="text-sm">
						Two factor authentication adds an extra layer of security to your
						account. You will need to enter a code from an authenticator app
						like{' '}
						<a className="underline" href="https://1password.com/">
							1Password
						</a>{' '}
						to log in.
					</p>
					<enable2FAFetcher.Form method="POST">
						<AuthenticityTokenInput />
						<StatusButton
							type="submit"
							name="intent"
							value="enable"
							status={enable2FAFetcher.state === 'loading' ? 'pending' : 'idle'}
							className="mx-auto"
						>
							Enable 2FA
						</StatusButton>
					</enable2FAFetcher.Form>
				</>
			)}
		</div>
	)
}
