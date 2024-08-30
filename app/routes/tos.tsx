import { Link } from '@remix-run/react'

export default function PrivacyPolicy() {
	return (
		<div>
			<p>2024-08-30</p>
			<h1 className="mb-4 text-xl">Terms of Service</h1>

			<p>
				<strong>1. Acceptance of Terms</strong>
			</p>
			<p>
				By signing up and using our website, you agree to these Terms of
				Service. Continued use of the website implies acceptance of any updated
				terms. We will notify you of updates via email.
			</p>

			<p>
				<strong>2. Account Responsibilities</strong>
			</p>
			<p>
				You must provide accurate and complete information when creating an
				account.
			</p>
			<p>
				You are responsible for all activities under your account and for
				maintaining the confidentiality of your account and password.
			</p>
			<p>
				Please notify us immediately of any unauthorized use of your account.
			</p>

			<p>
				<strong>3. Use of the Website</strong>
			</p>
			<p>Use the website only for lawful purposes.</p>
			<p>
				Do not engage in activities like spamming, hacking, or distributing
				malware that could harm us or other users.
			</p>

			<p>
				<strong>4. Termination</strong>
			</p>
			<p>
				We reserve the right to terminate or suspend your account at any time,
				without notice, for conduct that we believe violates these Terms of
				Service or is harmful to other users. If you believe your account was
				terminated in error, please contact us to appeal the decision.
			</p>

			<p>
				<strong>5. Limitation of Liability</strong>
			</p>
			<p>
				We are not liable for any indirect, incidental, special, or
				consequential damages arising out of your use of the website. This
				applies to the fullest extent permitted by law and is governed by the
				laws of France.
			</p>

			<p>
				<strong>6. Changes to Terms</strong>
			</p>
			<p>
				We may update these Terms of Service from time to time. We will notify
				you of any changes via email and by updating the date at the top of
				these terms.
			</p>

			<p>
				<strong>Contact Us</strong>
			</p>
			<p>
				If you have any questions about these Terms of Service, please contact
				us at{' '}
				<Link className="underline" to="mailto:mail@social-protocols.org">
					mail@social-protocols.org
				</Link>
				.
			</p>
		</div>
	)
}
