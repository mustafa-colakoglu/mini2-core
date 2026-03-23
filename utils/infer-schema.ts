/**
 * Infers OpenAPI JSON Schema from a JavaScript value
 */
export function inferSchema(value: any): any {
	if (value === null) {
		return { type: 'null' };
	}

	if (value === undefined) {
		return {};
	}

	if (Array.isArray(value)) {
		return {
			type: 'array',
			items: value.length > 0 ? inferSchema(value[0]) : { type: 'object' },
		};
	}

	const type = typeof value;

	switch (type) {
		case 'string':
			return { type: 'string' };

		case 'number':
			return Number.isInteger(value) ? { type: 'integer' } : { type: 'number' };

		case 'boolean':
			return { type: 'boolean' };

		case 'object': {
			const properties: any = {};
			const required: string[] = [];

			for (const [key, val] of Object.entries(value)) {
				properties[key] = inferSchema(val);
				if (val !== null && val !== undefined) {
					required.push(key);
				}
			}

			return {
				type: 'object',
				properties,
				...(required.length > 0 && { required }),
			};
		}

		default:
			return { type: 'object' };
	}
}
