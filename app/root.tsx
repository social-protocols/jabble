import { useForm } from '@conform-to/react'
import { parse } from '@conform-to/zod'
import { cssBundleHref } from '@remix-run/css-bundle'
import {
	type HeadersFunction,
	json,
	type LinksFunction,
	type MetaFunction,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import {
	Form,
	Link,
	Links,
	LiveReload,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useFetcher,
	useFetchers,
	useLoaderData,
	useLocation,
} from '@remix-run/react'
import { withSentry } from '@sentry/remix'
import { AuthenticityTokenProvider } from 'remix-utils/csrf/react'
import { ExternalScripts } from 'remix-utils/external-scripts'
import { HoneypotProvider } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { db } from '#app/database/db.ts'
import { GeneralErrorBoundary } from './components/error-boundary.tsx'
import { ErrorList } from './components/forms.tsx'
import { EpicProgress } from './components/progress-bar.tsx'
import { EpicToaster } from './components/toaster.tsx'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from './components/ui/dropdown-menu.tsx'
import { href as iconsHref, Icon } from './components/ui/icon.tsx'
import { type User } from './modules/auth/auth-types.ts'
import { SITE_NAME } from './site.ts'
import tailwindStyleSheetUrl from './styles/tailwind.css'
import { getUserId, logout } from './utils/auth.server.ts'
import { ClientHintCheck, getHints, useHints } from './utils/client-hints.tsx'
import { csrf } from './utils/csrf.server.ts'
import { getEnv } from './utils/env.server.ts'
import { honeypot } from './utils/honeypot.server.ts'
import { combineHeaders, getDomainUrl } from './utils/misc.tsx'
import { useNonce } from './utils/nonce-provider.ts'
import { useRequestInfo } from './utils/request-info.ts'
import { getTheme, setTheme, type Theme } from './utils/theme.server.ts'
import { makeTimings, time } from './utils/timing.server.ts'
import { getToast } from './utils/toast.server.ts'
import { useOptionalUser } from './utils/user.ts'

export const links: LinksFunction = () => {
	return [
		// Preload svg sprite as a resource to avoid render blocking
		{ rel: 'preload', href: iconsHref, as: 'image' },
		// Preload CSS as a resource to avoid render blocking
		{ rel: 'preload', href: tailwindStyleSheetUrl, as: 'style' },
		cssBundleHref ? { rel: 'preload', href: cssBundleHref, as: 'style' } : null,
		{ rel: 'mask-icon', href: '/favicons/mask-icon.svg' },
		{
			rel: 'alternate icon',
			type: 'image/png',
			href: '/favicons/favicon-32x32.png',
		},
		{ rel: 'apple-touch-icon', href: '/favicons/apple-touch-icon.png' },
		{
			rel: 'manifest',
			href: '/site.webmanifest',
			crossOrigin: 'use-credentials',
		} as const, // necessary to make typescript happy
		//These should match the css preloads above to avoid css as render blocking resource
		{ rel: 'icon', type: 'image/svg+xml', href: '/favicons/favicon.svg' },
		{ rel: 'stylesheet', href: tailwindStyleSheetUrl },
		cssBundleHref ? { rel: 'stylesheet', href: cssBundleHref } : null,
	].filter(Boolean)
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	return [
		{ title: data ? SITE_NAME : 'Error | ' + SITE_NAME },
		{ name: 'description', content: `Collaborative Fact-Checking` },
		// { tagName: 'meta', name: 'robots', content: 'noindex' },
	]
}

export async function loader({ request }: LoaderFunctionArgs) {
	const timings = makeTimings('root loader')
	const userId = await time(() => getUserId(request), {
		timings,
		type: 'getUserId',
		desc: 'getUserId in root',
	})

	const user: User | null = userId
		? await time(
				() =>
					db
						.selectFrom('User')
						.where('User.id', '=', userId)
						.select(['User.id', 'username', 'isAdmin'])
						.executeTakeFirstOrThrow(),
				{ timings, type: 'find user', desc: 'find user in root' },
			)
		: null
	if (userId && !user) {
		console.info('something weird happened')
		// something weird happened... The user is authenticated but we can't find
		// them in the database. Maybe they were deleted? Let's log them out.
		await logout({ request, redirectTo: '/' })
	}
	const { toast, headers: toastHeaders } = await getToast(request)
	const honeyProps = honeypot.getInputProps()
	const [csrfToken, csrfCookieHeader] = await csrf.commitToken()

	return json(
		{
			user,
			requestInfo: {
				hints: getHints(request),
				origin: getDomainUrl(request),
				path: new URL(request.url).pathname,
				userPrefs: {
					theme: getTheme(request),
				},
			},
			ENV: getEnv(),
			toast,
			honeyProps,
			csrfToken,
		},
		{
			headers: combineHeaders(
				{ 'Server-Timing': timings.toString() },
				toastHeaders,
				csrfCookieHeader ? { 'set-cookie': csrfCookieHeader } : null,
			),
		},
	)
}

export const headers: HeadersFunction = ({ loaderHeaders }) => {
	const headers = {
		'Server-Timing': loaderHeaders.get('Server-Timing') ?? '',
	}
	return headers
}

const ThemeFormSchema = z.object({
	theme: z.enum(['system', 'light', 'dark']),
})

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const submission = parse(formData, {
		schema: ThemeFormSchema,
	})
	if (submission.intent !== 'submit') {
		return json({ status: 'idle', submission } as const)
	}
	if (!submission.value) {
		return json({ status: 'error', submission } as const, { status: 400 })
	}
	const { theme } = submission.value

	const responseInit = {
		headers: { 'set-cookie': setTheme(theme) },
	}
	return json({ success: true, submission }, responseInit)
}

function Document({
	children,
	nonce,
	theme = 'light',
	env = {},
}: {
	children: React.ReactNode
	nonce: string
	theme?: Theme
	env?: Record<string, string>
}) {
	return (
		<html lang="en" className={`${theme} h-full overflow-x-hidden`}>
			<head>
				<ClientHintCheck nonce={nonce} />
				<Meta />
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width,initial-scale=1" />
				<Links />
				<ExternalScripts />
				{process.env.NODE_ENV === 'production' && (
					<script
						data-goatcounter="https://jabble.goatcounter.com/count"
						async
						src="//gc.zgo.at/count.js"
					></script>
				)}
			</head>
			<body className="bg-background text-foreground">
				{children}
				<script
					nonce={nonce}
					dangerouslySetInnerHTML={{
						__html: `window.ENV = ${JSON.stringify(env)}`,
					}}
				/>
				<ScrollRestoration nonce={nonce} />
				<Scripts nonce={nonce} />
				<LiveReload nonce={nonce} />
			</body>
		</html>
	)
}

function App() {
	const data = useLoaderData<typeof loader>()
	const nonce = useNonce()
	const theme = useTheme()
	// const matches = useMatches()
	// const isOnSearchPage = matches.find(m => m.id === 'routes/users+/index')
	const searchBar = null // isOnSearchPage ? null : <SearchBar status="idle" />

	return (
		<Document nonce={nonce} theme={theme} env={data.ENV}>
			<div className="flex h-screen flex-col">
				<header className="px-2 py-6">
					<nav>
						<div className="flex flex-wrap items-center gap-4 sm:flex-nowrap md:gap-8">
							<Link to="/">
								<div className="font-bold">
									{SITE_NAME} <span className="opacity-50">alpha</span>
								</div>
							</Link>
							{/*<div className="ml-auto hidden max-w-sm flex-1 sm:block">
								{searchBar}
							</div>*/}
							{/* <ThemeSwitch userPreference={data.requestInfo.userPrefs.theme} /> */}
							<NavigationMenu />
							<div className="ml-auto flex items-center gap-10">
								<UserMenu />
							</div>
							<div className="block w-full sm:hidden">{searchBar}</div>
						</div>
					</nav>
				</header>
				<div className="mx-auto w-full max-w-3xl px-2">
					<Outlet />
				</div>
			</div>
			<EpicToaster toast={data.toast} />
			<EpicProgress />
		</Document>
	)
}

function AppWithProviders() {
	const data = useLoaderData<typeof loader>()
	return (
		<AuthenticityTokenProvider token={data.csrfToken}>
			<HoneypotProvider {...data.honeyProps}>
				<App />
			</HoneypotProvider>
		</AuthenticityTokenProvider>
	)
}

export default withSentry(AppWithProviders)

function NavigationMenu() {
	const location = useLocation()

	const baseNavigationClassName = 'rounded-md py-1 px-2 hover:bg-post'
	// const fallacyDetectionClassName =
	// 	location.pathname == '/fallacy-detection' ? 'bg-post' : ''
	const pollsClassName = location.pathname == '/polls' ? 'bg-post' : ''
	const discussionsClassName =
		location.pathname == '/discussions' ? 'bg-post' : ''

	return (
		<>
			<Link
				to="/polls"
				className={baseNavigationClassName + ' ' + pollsClassName}
			>
				<Icon name="lightning-bolt">Polls</Icon>
			</Link>
			<Link
				to="/discussions"
				className={baseNavigationClassName + ' ' + discussionsClassName}
			>
				<Icon name="chat-bubble">Open Discussions</Icon>
			</Link>
			<Link to="/rhetorics" className={baseNavigationClassName}>
				<Icon name="hand">Rhetoric</Icon>
			</Link>
			{/*<Link
				to="/fallacy-detection"
				className={baseNavigationClassName + ' ' + fallacyDetectionClassName}
			>
				<Icon name="magic-wand">Fallacy Detection</Icon>
			</Link>*/}
		</>
	)
}

function UserMenu() {
	const user = useOptionalUser()
	const location = useLocation()

	const baseNavigationClassName = 'rounded py-1 px-2 hover:bg-post'
	const loginClassName = location.pathname == '/login' ? 'bg-post' : ''
	const signupClassName = location.pathname == '/signup' ? 'bg-post' : ''

	return user ? (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger>
					<div className="rounded border-2 border-solid bg-post px-4 py-2">
						<Icon name="person">{user.username}</Icon>
					</div>
				</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuItem>
						<Link to="/settings/profile">
							<Icon name="gear">Settings</Icon>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem>
						<Form action="/logout" method="POST">
							<button type="submit">
								<Icon className="text-body-md" name="exit">
									Logout
								</Icon>
							</button>
						</Form>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	) : (
		<>
			<Link
				to="/login"
				className={baseNavigationClassName + ' ' + loginClassName}
			>
				<Icon name="enter">Log In</Icon>
			</Link>
			<Link
				to="/signup"
				className={baseNavigationClassName + ' ' + signupClassName}
			>
				<Icon name="hand">Sign Up</Icon>
			</Link>
		</>
	)
}

/**
 * @returns the user's theme preference, or the client hint theme if the user
 * has not set a preference.
 */
export function useTheme() {
	const hints = useHints()
	const requestInfo = useRequestInfo()
	const optimisticMode = useOptimisticThemeMode()
	if (optimisticMode) {
		return optimisticMode === 'system' ? hints.theme : optimisticMode
	}
	return requestInfo.userPrefs.theme ?? hints.theme
}

/**
 * If the user's changing their theme mode preference, this will return the
 * value it's being changed to.
 */
export function useOptimisticThemeMode() {
	const fetchers = useFetchers()
	const themeFetcher = fetchers.find(f => f.formAction === '/')

	if (themeFetcher && themeFetcher.formData) {
		const submission = parse(themeFetcher.formData, {
			schema: ThemeFormSchema,
		})
		return submission.value?.theme
	}
}

function _ThemeSwitch({ userPreference }: { userPreference?: Theme | null }) {
	const fetcher = useFetcher<typeof action>()

	const [form] = useForm({
		id: 'theme-switch',
		lastSubmission: fetcher.data?.submission,
	})

	const optimisticMode = useOptimisticThemeMode()
	const mode = optimisticMode ?? userPreference ?? 'system'
	const nextMode =
		mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system'
	const modeLabel = {
		light: (
			<Icon name="sun">
				<span className="sr-only">Light</span>
			</Icon>
		),
		dark: (
			<Icon name="moon">
				<span className="sr-only">Dark</span>
			</Icon>
		),
		system: (
			<Icon name="laptop">
				<span className="sr-only">System</span>
			</Icon>
		),
	}

	return (
		<fetcher.Form method="POST" {...form.props}>
			<input type="hidden" name="theme" value={nextMode} />
			<div className="flex gap-2">
				<button
					type="submit"
					className="flex h-8 w-8 cursor-pointer items-center justify-center"
				>
					{modeLabel[mode]}
				</button>
			</div>
			<ErrorList errors={form.errors} id={form.errorId} />
		</fetcher.Form>
	)
}

export function ErrorBoundary() {
	// the nonce doesn't rely on the loader so we can access that
	const nonce = useNonce()

	// NOTE: you cannot use useLoaderData in an ErrorBoundary because the loader
	// likely failed to run so we have to do the best we can.
	// We could probably do better than this (it's possible the loader did run).
	// This would require a change in Remix.

	// Just make sure your root route never errors out and you'll always be able
	// to give the user a better UX.

	return (
		<Document nonce={nonce}>
			<GeneralErrorBoundary />
		</Document>
	)
}
