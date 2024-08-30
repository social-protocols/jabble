import { Link } from '@remix-run/react'

export default function PrivacyPolicy() {
	return (
		<div>
			<p>2024-08-30</p>
			<h1 className="mb-4 text-xl">Privacy Policy</h1>
			<p>
				<strong>1. Information We Collect</strong>
			</p>
			<p>We only collect your email address when you sign up for an account.</p>

			<p>
				<strong>2. How We Use Your Information</strong>
			</p>
			<p>
				Your email address is used solely for account creation and login
				purposes. We do not use it for any other purpose.
			</p>

			<p>
				<strong>3. Sharing Your Information</strong>
			</p>
			<p>We do not share your email address with any third parties.</p>

			<p>
				<strong>4. Data Security</strong>
			</p>
			<p>
				We take reasonable measures to protect your email address from
				unauthorized access or disclosure.
			</p>

			<p>
				<strong>5. Your Rights</strong>
			</p>
			<p>
				You can request to access or delete your email address from our system
				at any time. Just contact us at{' '}
				<Link className="underline" to="mailto:mail@social-protocols.org">
					mail@social-protocols.org
				</Link>
				.
			</p>

			<p>
				<strong>6. Changes to This Policy</strong>
			</p>
			<p>
				We may update this Privacy Policy occasionally. We will notify you of
				any changes by updating the date at the top of this policy.
			</p>

			<p>
				<strong>Contact Us</strong>
			</p>
			<p>
				If you have any questions about this Privacy Policy, please contact us
				at{' '}
				<Link className="underline" to="mailto:mail@social-protocols.org">
					mail@social-protocols.org
				</Link>
				.
			</p>
		</div>
	)
}
