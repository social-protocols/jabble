import { generateRobotsTxt } from '@nasa-gcn/remix-seo'
import { type LoaderFunctionArgs } from '@remix-run/node'

export function loader({}: LoaderFunctionArgs) {
	return generateRobotsTxt(
		[
			{
				type: 'userAgent',
				value: '*',
			},
			{
				type: 'disallow',
				value: '/',
			},
		],
		{
			appendOnDefaultPolicies: false,
		},
	)
}
