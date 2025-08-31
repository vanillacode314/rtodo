import { match, type } from 'arktype';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '~/db/client';
import { getNodeByPath } from '~/db/queries/nodes';
import * as schema from '~/db/schema';

import { queries } from '.';

const validMessage = type({
	user_intent: '"create_node"',
	meta: {
		parentPath: 'string',
		name: 'string'
	}
})
	.or({
		user_intent: '"rename_node"',
		meta: {
			parentPath: 'string',
			oldName: 'string',
			newName: 'string'
		}
	})
	.or({
		user_intent: '"delete_node"',
		meta: {
			parentPath: 'string',
			name: 'string'
		}
	})
	.or({
		user_intent: '"move_node"',
		meta: {
			name: 'string',
			oldParentPath: 'string',
			newParentPath: 'string'
		}
	})
	.or({
		user_intent: '"create_task"',
		meta: {
			path: 'string',
			body: 'string',
			index: '0 <= number <= 1',
			goesOffAt: type('string.date.iso').pipe((value) => new Date(value)),
			'repeatsEvery?': type({
				count: 'number',
				duration: '"day"|"month"|"year"'
			}).or('null')
		}
	});

type TValidMessage = typeof validMessage.infer;

const processMessage = match
	.in<TValidMessage>()
	.at('user_intent')
	.match({
		"'create_node'": async ({ meta: { parentPath, name } }) => {
			const [parentNode] = await getNodeByPath(parentPath);
			if (!parentNode) {
				throw new Error('Parent node not found');
			}
			const existingNode = await queries.getNodeByNameAndParentId({
				name,
				parentId: parentNode.id
			});
			if (existingNode && existingNode.deleted) {
				return [
					{
						operation: 'update',
						table: schema.nodes,
						id: existingNode.id,
						data: { deleted: false }
					}
				];
			}
			if (existingNode) return [];
			return [
				{
					operation: 'insert',
					table: schema.nodes,
					id: nanoid(),
					data: {
						name,
						parentId: parentNode.id
					}
				}
			];
		},
		"'rename_node'": async ({ meta: { parentPath, oldName, newName } }) => {
			const [parentNode] = await getNodeByPath(parentPath);
			if (!parentNode) {
				throw new Error('Parent node not found');
			}
			const node = await queries.getNodeByNameAndParentId({
				name: oldName,
				parentId: parentNode.id
			});
			if (!node) {
				throw new Error('Node not found');
			}
			const existingNode = await queries.getNodeByNameAndParentId({
				name: newName,
				parentId: parentNode.id
			});
			if (existingNode && existingNode.deleted) {
				const childNodes = await queries.getChildrenByNodeId(node.id);
				const tasks = await db.select().from(schema.tasks).where(eq(schema.tasks.nodeId, node.id));

				return [
					...childNodes.map((node) => ({
						operation: 'update',
						table: schema.nodes,
						id: node.id,
						data: { parentId: existingNode.id }
					})),
					...tasks.map((task) => ({
						operation: 'update',
						table: schema.tasks,
						id: task.id,
						data: { nodeId: existingNode.id }
					})),
					{
						operation: 'update',
						table: schema.nodes,
						id: node.id,
						data: { deleted: true }
					},
					{
						operation: 'update',
						table: schema.nodes,
						id: existingNode.id,
						data: { deleted: false, name: newName }
					}
				];
			}
			if (existingNode) {
				throw new Error('Node with new name already exists');
			}
			return [
				{
					operation: 'update',
					table: schema.nodes,
					id: node.id,
					data: { name: newName }
				}
			];
		},
		"'delete_node'": async ({ meta: { parentPath, name } }) => {
			const [parentNode] = await getNodeByPath(parentPath);
			if (!parentNode) {
				throw new Error('Parent node not found');
			}
			const node = await queries.getNodeByNameAndParentId({
				name,
				parentId: parentNode.id
			});
			if (!node) {
				throw new Error('Node not found');
			}
			if (node.deleted) return [];
			return [
				{
					operation: 'update',
					table: schema.nodes,
					id: node.id,
					data: { deleted: true }
				}
			];
		},
		"'move_node'": async ({ meta: { oldParentPath, newParentPath, name } }) => {
			const [oldParentNode] = await getNodeByPath(oldParentPath);
			const [newParentNode] = await getNodeByPath(newParentPath);
			if (!oldParentNode || !newParentNode) {
				throw new Error('Parent node not found');
			}

			const node = await queries.getNodeByNameAndParentId({
				name,
				parentId: oldParentNode.id
			});
			if (!node) {
				throw new Error('Node not found');
			}

			const existingNode = await queries.getNodeByNameAndParentId({
				name,
				parentId: newParentNode.id
			});

			if (existingNode && existingNode.deleted) {
				const childNodes = await queries.getChildrenByNodeId(node.id);
				const tasks = await db.select().from(schema.tasks).where(eq(schema.tasks.nodeId, node.id));

				return [
					...childNodes.map((node) => ({
						operation: 'update',
						table: schema.nodes,
						id: node.id,
						data: { parentId: existingNode.id }
					})),
					...tasks.map((task) => ({
						operation: 'update',
						table: schema.tasks,
						id: task.id,
						data: { nodeId: existingNode.id }
					})),
					{
						operation: 'update',
						table: schema.nodes,
						id: node.id,
						data: { deleted: true }
					},
					{
						operation: 'update',
						table: schema.nodes,
						id: existingNode.id,
						data: { deleted: false }
					}
				];
			}
			if (existingNode) {
				throw new Error('Node with same name already exists in new parent');
			}
			return [
				{
					operation: 'update',
					table: schema.nodes,
					id: node.id,
					data: { parentId: newParentNode.id }
				}
			];
		},
		"'create_task'": async ({ meta: { path, body, index, goesOffAt, repeatsEvery } }) => {
			if (!path.endsWith('.list')) {
				throw new Error(`Given path is not a list: "${path}"`);
			}

			const [node] = await getNodeByPath(path);
			if (!node) {
				throw new Error(`Node with path "${path}" not found`);
			}
			return [
				{
					operation: 'insert',
					table: schema.tasks,
					id: nanoid(),
					data: {
						goesOffAt: goesOffAt.getTime(),
						nodeId: node.id,
						body,
						index,
						repeatsEvery
					}
				}
			];
		},
		default: 'assert'
	});

export { processMessage, validMessage };
export type { TValidMessage };
