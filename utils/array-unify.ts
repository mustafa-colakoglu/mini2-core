export function arrayUnify<T>(array: T[]) {
	const unified = [...new Set([...array])];
	return unified;
}
