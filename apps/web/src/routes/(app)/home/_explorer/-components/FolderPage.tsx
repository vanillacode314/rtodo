import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
	draggable,
	dropTargetForElements,
	monitorForElements
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { createKeyHold } from '@solid-primitives/keyboard';
import { Key } from '@solid-primitives/keyed';
import { resolveElements } from '@solid-primitives/refs';
import { createListTransition } from '@solid-primitives/transition-group';
import { useQuery, useQueryClient } from '@tanstack/solid-query';
import { getRouteApi, Link, useLocation, useNavigate } from '@tanstack/solid-router';
import { animate, spring } from 'motion';
import {
	createRenderEffect,
	createSignal,
	For,
	type JSXElement,
	onCleanup,
	onMount,
	type ParentComponent,
	Show
} from 'solid-js';
import { toast } from 'solid-sonner';

import type { TAction } from '~/context/app.types';

import { useConfirmModal } from '~/components/modals/auto-import/ConfirmModal';
import { setCreateFileModalOpen } from '~/components/modals/auto-import/CreateFileModal';
import { setCreateFolderModalOpen } from '~/components/modals/auto-import/CreateFolderModal';
import { setRenameFileModalOpen } from '~/components/modals/auto-import/RenameFileModal';
import { setRenameFolderModalOpen } from '~/components/modals/auto-import/RenameFolderModal';
import Modal from '~/components/modals/BaseModal';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuShortcut,
	DropdownMenuTrigger
} from '~/components/ui/dropdown-menu';
import { useApp } from '~/context/app';
import { getNodeByPath, getPathByNodeId } from '~/db/queries/nodes';
import * as schema from '~/db/schema';
import { nodesSchema } from '~/db/schema';
import { queries } from '~/queries';
import { createMessages } from '~/utils/messages';
import * as path from '~/utils/path';
import { cn } from '~/utils/tailwind';

export function FolderPage() {
	const queryClient = useQueryClient();
	const [
		appContext,
		{ filterClipboard, addToClipboard, clearClipboard, setActions, setCurrentNode }
	] = useApp();
	const routeApi = getRouteApi('/(app)/home/_explorer/$');
	const loaderData = routeApi.useLoaderData();

	const nodes = useQuery(() => ({
		...queries.nodes.byPath(loaderData().path, { includeChildren: true }),
		throwOnError: true
	}));

	const currentNode = () => nodes.data![0];
	const children = () => nodes.data?.slice(1) ?? [];
	const folders = () => children().filter((node) => !node.name.endsWith('.list'));
	const files = () => children().filter((node) => node.name.endsWith('.list'));
	const nodesInClipboard = () =>
		appContext.clipboard.filter(
			(item) => item.type === 'id/node' && (item.mode === 'move' || item.mode === 'copy')
		);
	const selectedNodes = () =>
		appContext.clipboard.filter((item) => item.mode === 'selection' && item.type === 'id/node');

	createRenderEffect(() => {
		const actions: TAction[] = [];
		if (appContext.mode === 'normal') {
			actions.push(
				{
					handler: (event) => {
						setCurrentNode(currentNode());
						setCreateFolderModalOpen(true);
					},
					icon: 'i-heroicons:folder-plus',
					label: 'Create Folder',
					variant: 'secondary'
				},
				{
					handler: (event) => {
						setCurrentNode(currentNode());
						setCreateFileModalOpen(true);
					},
					icon: 'i-heroicons:document-plus',
					label: 'Create List'
				}
			);
		}
		if (appContext.mode === 'selection') {
			actions.push({
				handler: clearClipboard,
				icon: 'i-heroicons:x-circle',
				label: 'Clear',
				variant: 'secondary'
			});
		}

		if (appContext.mode === 'selection' && selectedNodes().length > 0) {
			actions.push({
				handler: () => {
					filterClipboard((item) => item.mode !== 'selection');
					addToClipboard(
						...children().map((node) => ({
							data: node.id,
							meta: {
								node,
								path: path.join('/home', location().pathname, node.name)
							},
							mode: 'selection' as const,
							type: 'id/node' as const
						}))
					);
				},
				icon: 'i-fluent:select-all-24-filled',
				label: 'Select All',
				variant: 'secondary'
			});
		}
		setActions(actions);
	});

	onMount(() => {
		const cleanup = combine(
			monitorForElements({
				canMonitor({ source }) {
					return source.data.type === 'node';
				},
				async onDrop({ location, source }) {
					const destination = location.current.dropTargets[0];
					if (!destination) return;
					if (!(destination.data.type === 'node' && source.data.type === 'node')) return;
					if (typeof destination.data.id !== 'string') return;
					if (typeof source.data.id !== 'string') return;

					const toastId = toast.loading('Moving...');
					try {
						const newParentPath = await getPathByNodeId(destination.data.id);
						if (!newParentPath) {
							toast.error('Something went wrong. Please try again.', { id: toastId });
							return;
						}
						const node = nodesSchema.assert(source.data.node);
						const newNodePath = path.join(newParentPath, node.name);

						const [existingNode] = await getNodeByPath(newNodePath);
						if (existingNode && !existingNode.deleted) {
							toast.error(`A file with the name ${node.name} already exists`);
							return;
						}
						const oldParentPath = await getPathByNodeId(node.parentId!);
						if (!oldParentPath) {
							toast.error('Something went wrong. Please try again.', { id: toastId });
							return;
						}
						await createMessages({
							user_intent: 'move_node',
							meta: {
								oldParentPath,
								newParentPath,
								name: node.name
							}
						});
						await queryClient.invalidateQueries({ queryKey: queries.nodes.all() });
						toast.success('Moved Successfully', { id: toastId });
					} catch {
						toast.error('An Error Occcured', { id: toastId });
					}
				}
			})
		);
		onCleanup(cleanup);
	});

	return (
		<>
			<HelpOverlay />
			<div class="flex h-full flex-col overflow-x-hidden overflow-y-auto">
				{/* <Toolbar actions={actions()} currentNode={currentNode()!} nodes={children()} /> */}
				<Show fallback={<EmptyFolder currentNode={currentNode()} />} when={children().length > 0}>
					<AnimatedNodesList>
						<Show when={currentNode().parentId !== null}>
							<FolderNode
								node={{
									createdAt: '',
									id: currentNode().parentId!,
									name: '..',
									parentId: '__parent__',
									updatedAt: {},
									deleted: false
								}}
							/>
						</Show>
						<Key by="id" each={folders()}>
							{(node) => <FolderNode node={node()} />}
						</Key>
						<Key by="id" each={files()}>
							{(node) => <FileNode node={node()} />}
						</Key>
					</AnimatedNodesList>
				</Show>
			</div>
		</>
	);
}

function EmptyFolder(props: { currentNode: schema.TNode }) {
	const [, { setCurrentNode }] = useApp();

	return (
		<div class="relative isolate grid h-full place-content-center place-items-center gap-4 font-medium">
			{/* <img */}
			{/* 	class="pointer-events-none absolute -z-10 h-full w-full object-contain opacity-5" */}
			{/* 	src="/empty.svg" */}
			{/* /> */}
			<span>Empty Folder</span>
			<div class="flex flex-col items-center justify-end gap-4 sm:flex-row">
				<Button
					class="flex items-center gap-2"
					onClick={(event) => {
						setCurrentNode(props.currentNode);
						setCreateFileModalOpen(true, event.currentTarget);
					}}
				>
					<span class="i-heroicons:document-plus text-lg" />
					<span>Create List</span>
				</Button>
				OR
				<Button
					class="flex items-center gap-2"
					onClick={(event) => {
						setCurrentNode(props.currentNode);
						setCreateFolderModalOpen(true, event.currentTarget);
					}}
				>
					<span class="i-heroicons:folder-plus text-lg" />
					<span>Create Folder</span>
				</Button>
			</div>
		</div>
	);
}

function FileNode(props: { node: schema.TNode }) {
	const queryClient = useQueryClient();
	const [appContext, { addToClipboard, setCurrentNode }] = useApp();
	async function deleteFile() {
		const parentPath = await getPathByNodeId(props.node.parentId!);
		if (!parentPath) {
			throw new Error('Parent path not found');
		}
		await createMessages({
			user_intent: 'delete_node',
			meta: {
				parentPath,
				name: props.node.name
			}
		});
		void queryClient.invalidateQueries({ queryKey: queries.nodes.all() });
		void queryClient.invalidateQueries({ queryKey: queries.tasks.all() });
	}
	const confirmModal = useConfirmModal();

	let ref!: HTMLDivElement;
	let dragHandleRef!: HTMLButtonElement;

	onMount(() => {
		const cleanup = combine(
			draggable({
				dragHandle: dragHandleRef,
				element: ref,
				getInitialData: () => ({
					id: props.node.id,
					node: props.node,
					type: 'node'
				})
			})
		);
		onCleanup(cleanup);
	});

	return (
		<Node
			class="group"
			dragHandleRef={dragHandleRef}
			dropdownMenu={
				<DropdownMenu>
					<DropdownMenuTrigger
						as={Button<'button'>}
						class="can-hover:invisible group-hover:can-hover:visible size-14 rounded-none"
						size="icon"
						variant="ghost"
					>
						<span class="i-heroicons:ellipsis-vertical text-lg" />
					</DropdownMenuTrigger>
					<DropdownMenuContent class="w-48">
						<DropdownMenuItem
							onSelect={() => {
								setCurrentNode(props.node);
								setRenameFileModalOpen(true);
							}}
						>
							<span>Rename</span>
							<DropdownMenuShortcut class="text-base">
								<span class="i-heroicons:pencil-solid" />
							</DropdownMenuShortcut>
						</DropdownMenuItem>
						{/* <DropdownMenuItem */}
						{/* 	onSelect={() => { */}
						{/* 		if ( */}
						{/* 			appContext.clipboard.some( */}
						{/* 				(item) => item.type === 'id/node' && item.data === props.node.id */}
						{/* 			) */}
						{/* 		) */}
						{/* 			return; */}
						{/**/}
						{/* 		addToClipboard({ */}
						{/* 			data: props.node.id, */}
						{/* 			meta: { */}
						{/* 				node: props.node, */}
						{/* 				path: path.join('/home', appContext.path, props.node.name) */}
						{/* 			}, */}
						{/* 			mode: 'move', */}
						{/* 			type: 'id/node' */}
						{/* 		}); */}
						{/* 	}} */}
						{/* > */}
						{/* 	<span>Cut</span> */}
						{/* 	<DropdownMenuShortcut class="text-base"> */}
						{/* 		<span class="i-heroicons:scissors" /> */}
						{/* 	</DropdownMenuShortcut> */}
						{/* </DropdownMenuItem> */}
						<DropdownMenuItem
							onSelect={() => {
								confirmModal.open({
									message: `Are you sure you want to delete ${props.node.name}?`,
									onYes: () =>
										deleteFile().catch((error) => {
											console.error(error);
											toast.error('Something went wrong');
										}),
									title: 'Delete File'
								});
							}}
						>
							<span>Delete</span>
							<DropdownMenuShortcut class="text-base">
								<span class="i-heroicons:trash" />
							</DropdownMenuShortcut>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			}
			icon="i-heroicons:document"
			node={props.node}
			ref={ref}
		/>
	);
}

function FolderNode(props: { node: schema.TNode }) {
	const queryClient = useQueryClient();
	const [appContext, { addToClipboard, setCurrentNode }] = useApp();
	async function deleteFolder(id: string = props.node.id) {
		const parentPath = await getPathByNodeId(props.node.parentId!);
		if (!parentPath) {
			throw new Error('Parent path not found');
		}
		await createMessages({
			user_intent: 'delete_node',
			meta: {
				parentPath,
				name: props.node.name
			}
		});
		void queryClient.invalidateQueries({ queryKey: queries.nodes.all() });
	}
	const confirmModal = useConfirmModal();

	let ref!: HTMLDivElement;
	let dragHandleRef!: HTMLButtonElement;

	const [dragState, setDragState] = createSignal<'dragging-over' | null>(null);

	onMount(() => {
		const cleanup = combine(
			draggable({
				dragHandle: dragHandleRef,
				element: ref,
				getInitialData: () => ({
					id: props.node.id,
					node: props.node,
					type: 'node'
				})
			}),
			dropTargetForElements({
				canDrop({ source }) {
					return source.data.type === 'node' && source.data.id !== props.node.id;
				},
				element: ref,
				getData: () => ({ id: props.node.id, type: 'node' }),
				onDragEnter: () => setDragState('dragging-over'),
				onDragLeave: () => setDragState(null),
				onDrop: () => {
					setDragState(null);
				}
			})
		);
		onCleanup(cleanup);
	});

	return (
		<Node
			class={cn('group', dragState() === 'dragging-over' ? 'ring ring-inset' : '')}
			dragHandleRef={dragHandleRef}
			dropdownMenu={
				<DropdownMenu>
					<DropdownMenuTrigger
						as={Button<'button'>}
						class="can-hover:invisible group-hover:can-hover:visible size-14 rounded-none"
						size="icon"
						variant="ghost"
					>
						<span class="i-heroicons:ellipsis-vertical text-lg" />
					</DropdownMenuTrigger>
					<DropdownMenuContent class="w-48">
						<DropdownMenuItem
							onSelect={() => {
								setCurrentNode(props.node);
								setRenameFolderModalOpen(true);
							}}
						>
							<span>Rename</span>
							<DropdownMenuShortcut class="text-base">
								<span class="i-heroicons:pencil-solid" />
							</DropdownMenuShortcut>
						</DropdownMenuItem>
						{/**/}
						{/* <DropdownMenuItem */}
						{/* 	onSelect={() => { */}
						{/* 		if ( */}
						{/* 			appContext.clipboard.some( */}
						{/* 				(item) => item.type === 'id/node' && item.data === props.node.id */}
						{/* 			) */}
						{/* 		) */}
						{/* 			return; */}
						{/* 		addToClipboard({ */}
						{/* 			data: props.node.id, */}
						{/* 			meta: { */}
						{/* 				node: props.node, */}
						{/* 				path: path.join('/home', appContext.path, props.node.name) */}
						{/* 			}, */}
						{/* 			mode: 'move', */}
						{/* 			type: 'id/node' */}
						{/* 		}); */}
						{/* 	}} */}
						{/* > */}
						{/* 	<span>Cut</span> */}
						{/* 	<DropdownMenuShortcut class="text-base"> */}
						{/* 		<span class="i-heroicons:scissors" /> */}
						{/* 	</DropdownMenuShortcut> */}
						{/* </DropdownMenuItem> */}
						<DropdownMenuItem
							onSelect={() => {
								confirmModal.open({
									message: `Are you sure you want to delete ${props.node.name}?`,
									onYes: () =>
										deleteFolder().catch((err) => {
											console.error(err);
											toast.error('Something went wrong');
										}),
									title: 'Delete Folder'
								});
							}}
						>
							<span>Delete</span>
							<DropdownMenuShortcut class="text-base">
								<span class="i-heroicons:trash" />
							</DropdownMenuShortcut>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			}
			icon="i-heroicons:folder"
			node={props.node}
			ref={ref}
		/>
	);
}

function FolderNotFound() {
	return (
		<div class="grid h-full w-full place-content-center gap-4 text-lg font-medium">
			<div>Folder Not Found</div>
			<Button as={Link} to="/home">
				Go Home
			</Button>
		</div>
	);
}

function Node(props: {
	class?: string;
	dragHandleRef: HTMLButtonElement;
	dropdownMenu: JSXElement;
	icon: string;
	node: schema.TNode;
	ref: HTMLDivElement;
}) {
	const [appContext, { addToClipboard, filterClipboard }] = useApp();
	const navigate = useNavigate();
	const shiftKey = createKeyHold('Shift', { preventDefault: false });
	const isSelected = () =>
		appContext.clipboard.some(
			(item) => item.data === props.node.id && item.type === 'id/node' && item.mode === 'selection'
		);

	const selectionMode = () => shiftKey() || appContext.mode === 'selection';
	const location = useLocation();
	const href = () => path.join(location().pathname, props.node.name);

	return (
		<div
			class={cn('bg-primary/5 relative flex overflow-hidden transition-transform', props.class)}
			ref={props.ref}
		>
			<Show when={selectionMode()}>
				<label
					class="absolute inset-0 z-10 bg-transparent"
					for={`select-${props.node.id}-input`}
					onClick={(event) => {
						event.preventDefault();
						event.stopPropagation();
						if (props.node.name === '..') return;

						if (!isSelected()) {
							addToClipboard({
								data: props.node.id,
								meta: {
									node: props.node,
									path: path.join('/home', location().pathname, props.node.name)
								},
								mode: 'selection',
								type: 'id/node'
							});
							return;
						}

						filterClipboard(
							(item) =>
								!(
									item.data === props.node.id &&
									item.type === 'id/node' &&
									item.mode === 'selection'
								)
						);
					}}
				/>
			</Show>
			<div class="ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring grid grow grid-cols-[auto_1fr] text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50">
				{/* NOTE: Not using anchor to make sure we control the drag behaviour */}
				<button
					class="grid cursor-move place-content-center px-4 py-4"
					data-href={href()}
					onClick={(event) => {
						const target = event.currentTarget;
						navigate({ to: target.dataset.href });
					}}
					ref={props.dragHandleRef}
					role="link"
					type="button"
				>
					<span class={cn('text-lg', props.icon)} />
				</button>
				<Link
					class="flex items-center gap-2 overflow-hidden py-4"
					title={props.node.name}
					to={href()}
				>
					<span class="truncate">{props.node.name}</span>
				</Link>
			</div>
			<Show
				fallback={
					<div class="grid size-14 place-content-center">
						<Checkbox
							checked={isSelected()}
							class="space-x-0"
							id={`select-${props.node.id}`}
							onChange={(checked) => {
								if (checked)
									addToClipboard({
										data: props.node.id,
										meta: {
											node: props.node,
											path: path.join('/home', location().pathname, props.node.name)
										},
										mode: 'selection',
										type: 'id/node'
									});
								else {
									filterClipboard(
										(item) =>
											!(
												item.data === props.node.id &&
												item.type === 'id/node' &&
												item.mode === 'selection'
											)
									);
								}
							}}
						/>
					</div>
				}
				when={!selectionMode() || props.node.name === '..'}
			>
				<Show when={props.node.name !== '..'}>{props.dropdownMenu}</Show>
			</Show>
		</div>
	);
}

function Toolbar(props: { actions: TAction[]; currentNode: schema.TNode; nodes: schema.TNode[] }) {
	return (
		<div class="hidden justify-end gap-4 empty:hidden md:flex">
			<For each={props.actions}>
				{(action) => (
					<Button
						class="flex items-center gap-2"
						onClick={action.handler}
						type="button"
						variant={action.variant}
					>
						<span class={cn(action.icon, 'text-lg')} />
						<span>{action.label}</span>
					</Button>
				)}
			</For>
		</div>
	);
}

const AnimatedNodesList: ParentComponent = (props) => {
	const resolved = resolveElements(
		() => props.children,
		(el): el is HTMLElement => el instanceof HTMLElement
	);

	const transition = createListTransition(resolved.toArray, {
		onChange({ added, finishRemoved, removed, unchanged }) {
			finishRemoved(removed);
			if (added.length === 0 && removed.length === 0) return;
			for (const el of unchanged) {
				const { left: left1, top: top1 } = el.getBoundingClientRect();
				if (!el.isConnected) return;
				queueMicrotask(() => {
					const { left: left2, top: top2 } = el.getBoundingClientRect();
					const hasTransition = el.classList.contains('transition-transform');
					if (hasTransition) el.classList.remove('transition-transform');
					const animation = animate(
						el,
						{ x: [left1 - left2, 0], y: [top1 - top2, 0] },
						{ damping: 20, stiffness: 150, type: spring }
					);
					animation.then(() => {
						if (hasTransition) el.classList.add('transition-transform');
					});
				});
			}
		}
	});

	return (
		<div class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-1">{transition()}</div>
	);
};

function HelpOverlay() {
	const [open, setOpen] = createSignal(false);

	return (
		<>
			<Modal id="help-overlay" open={open()} setOpen={setOpen} title="Help">
				{() => (
					<>
						<p>Hold shift to access multi selection mode</p>
					</>
				)}
			</Modal>
			<div class="fixed right-4 bottom-4 hidden opacity-50 md:block">
				<button onClick={() => setOpen(true)} type="button">
					<span class="i-heroicons:question-mark-circle text-2xl" />
				</button>
			</div>
		</>
	);
}
