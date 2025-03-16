import { create } from 'mutative';
import { nanoid } from 'nanoid';
import { createComputed, createContext, JSXElement, untrack, useContext } from 'solid-js';
import { createStore } from 'solid-js/store';

import * as schema from '~/db/schema';

type TAppContext = {
	clipboard: TClipboardItem[];
	connectedClients: Array<{
		currentlyAt: {
			id: string;
			resourceType: string;
		};
		id: string;
		name: string;
	}>;
	currentNode: null | schema.TNode;
	currentTask: null | schema.TTask;
	id: string;
	mode: 'normal' | 'selection';
	path: string;
};
type TClipboardItem = {
	data: string;
	meta?: unknown;
	mode: 'copy' | 'move' | 'selection';
	type: `${string}/${string}`;
};
const DEFAULT_APP_CONTEXT = Object.freeze({
	clipboard: [],
	currentNode: null,
	currentTask: null,
	id: nanoid(),
	mode: 'normal',
	path: '/',
	connectedClients: []
} satisfies TAppContext);
const AppContext = createContext<
	[
		appContext: TAppContext,
		{
			addToClipboard: (...item: TClipboardItem[]) => void;
			clearClipboard: () => void;
			filterClipboard: (predicate: (item: TClipboardItem) => boolean) => void;
			setCurrentNode: (node: schema.TNode) => void;
			setCurrentTask: (task: schema.TTask) => void;
			setMode: (mode: TAppContext['mode']) => void;
		}
	]
>();

function AppProvider(props: { children: JSXElement; path: string }) {
	const [appContext, setAppContext] = createStore<TAppContext>({
		...structuredClone(DEFAULT_APP_CONTEXT),
		path: decodeURIComponent(props.path)
	});

	createComputed(() => {
		const { path } = props;
		untrack(() => setAppContext('path', decodeURIComponent(path)));
	});

	return (
		<AppContext.Provider
			value={[
				appContext,
				{
					addToClipboard(...items) {
						setAppContext(
							create((app) => {
								app.clipboard.push(...items);
								if (items.some((item) => item.mode === 'selection')) app.mode = 'selection';
							})
						);
					},
					clearClipboard() {
						setAppContext(
							create((app) => {
								app.clipboard.length = 0;
								app.mode = 'normal';
							})
						);
					},
					filterClipboard(predicate) {
						setAppContext(
							create((app) => {
								app.clipboard = app.clipboard.filter(predicate);
							})
						);
					},
					setCurrentNode(node) {
						setAppContext(
							create((app) => {
								app.currentNode = node;
							})
						);
					},
					setCurrentTask(task) {
						setAppContext(
							create((app) => {
								app.currentTask = task;
							})
						);
					},
					setMode(mode) {
						setAppContext(
							create((app) => {
								app.mode = mode;
							})
						);
					}
				}
			]}
		>
			{props.children}
		</AppContext.Provider>
	);
}

function useApp() {
	const value = useContext(AppContext);
	if (!value) throw new Error('useApp must be used within an AppProvider');
	return value;
}

export { AppProvider, useApp };
export type { TClipboardItem };
