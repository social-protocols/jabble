import { flatRoutes } from 'remix-flat-routes'

export default {
	cacheDirectory: './node_modules/.cache/remix',
	ignoredRouteFiles: ['**/*', '**/.DS_Store'],
	serverModuleFormat: 'esm',
	serverPlatform: 'node',
	tailwind: true,
	postcss: true,
	watchPaths: ['./tailwind.config.ts'],
	browserNodeBuiltinsPolyfill: { modules: { assert: true } },
	routes: defineRoutes => {
		return flatRoutes('routes', defineRoutes, {
			ignoredRouteFiles: [
				'.*',
				'**/*.css',
				'**/*.test.{js,jsx,ts,tsx}',
				'**/__*.*',
			],
		})
	},
}
