import { type } from 'arktype';

function parseFormErrors<T extends type.errors>(
	input: T
): Record<'form' | keyof T['byPath'], string[]> {
	return input.reduce(
		(errors, { path, problem }) => {
			const name = String(path.at(-1) ?? 'form');
			errors[name] ??= [];
			errors[name].push(name === 'form' ? problem : `${String(name)} ${problem}`);
			return errors;
		},
		{} as Record<string, string[]>
	) as Record<'form' | keyof T['byPath'], string[]>;
}

export { parseFormErrors };
