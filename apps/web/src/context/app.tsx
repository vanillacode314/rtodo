import { create } from 'mutative';
import { createContext, createRenderEffect, JSXElement, untrack, useContext } from 'solid-js';
import { createStore } from 'solid-js/store';

import * as schema from '~/db/schema';
import { throwOnParseError } from '~/utils/arktype';

import { actionSchema, appContextSchema, TAppContext, TClipboardItem } from './app.types';

const AppContext = createContext<
	[
		appContext: TAppContext,
		{
			addToClipboard: (...item: TClipboardItem[]) => void;
			clearClipboard: () => void;
			filterClipboard: (predicate: (item: TClipboardItem) => boolean) => void;
			setActions: (actions: Array<typeof actionSchema.inferIn>) => void;
			setCurrentNode: (node: schema.TNode) => void;
			setCurrentTask: (task: schema.TTask) => void;
			setMode: (mode: TAppContext['mode']) => void;
		}
	]
>();

function AppProvider(props: { children: JSXElement; path: string }) {
	const initialValue = throwOnParseError(
		appContextSchema({
			get path() {
				return decodeURIComponent(props.path);
			}
		})
	);
	const [appContext, setAppContext] = createStore<TAppContext>(initialValue);

	function resetActionsOnPathChange() {
		void props.path;
		untrack(() => {
			setAppContext(
				create((app) => {
					app.actions.length = 0;
				})
			);
		});
	}
	createRenderEffect(resetActionsOnPathChange);

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
					},
					setActions(actions) {
						setAppContext(
							create((app) => {
								app.actions = throwOnParseError(actionSchema.array()(actions));
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
