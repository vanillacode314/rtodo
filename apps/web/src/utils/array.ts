export async function asyncFilter<T>(
	array: T[],
	predicate: (element: T, index: number, array: T[]) => Promise<boolean>
): Promise<T[]> {
	const resolved = await Promise.all(array.map(predicate));
	return array.filter((_, index) => resolved[index]);
}
