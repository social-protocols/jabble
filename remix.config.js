import { withEsbuildOverride } from 'remix-esbuild-override'
import { flatRoutes } from 'remix-flat-routes'

// https://github.com/remix-run/remix/issues/1823
withEsbuildOverride(option => {
	if (!option.external && option.bundle) {
		option.external = ['nock', 'mock-aws-s3', 'node-pre-gyp', 'node-gyp']
	}
	return option
})

/**
 * @type {import('@remix-run/dev').AppConfig}
 */
export default {
	cacheDirectory: './node_modules/.cache/remix',
	ignoredRouteFiles: ['**/*', '**/.DS_Store'],
	serverModuleFormat: 'esm',
	serverPlatform: 'node',
	tailwind: true,
	postcss: true,
	watchPaths: ['./tailwind.config.ts'],
	browserNodeBuiltinsPolyfill: { modules: { assert: true } },
	routes: async defineRoutes => {
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
