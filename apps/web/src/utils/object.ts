function filterKeys<TObj extends Record<string, unknown>, TKeys extends keyof TObj>(
	obj: TObj,
	keys: TKeys[]
): Omit<TObj, (typeof keys)[number]> {
	const result = { ...obj };
	for (const key of keys) {
		delete result[key];
	}
	return result;
}

export { filterKeys };
