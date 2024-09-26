export function snakeToCamelCase(str: string): string {
	return str.replace(/([-_][a-z])/g, group =>
		group.toUpperCase().replace('-', '').replace('_', ''),
	)
}

export function snakeToCamelCaseObject(obj: any): any {
	if (obj instanceof Array) {
		return obj.map(v => snakeToCamelCaseObject(v))
	} else if (obj !== null && obj.constructor === Object) {
		return Object.keys(obj).reduce((result, key) => {
			result[snakeToCamelCase(key)] = snakeToCamelCaseObject(obj[key])
			return result
		}, {} as any)
	}
	return obj
}

export function camelToSnakeCase(str: string): string {
	return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}
