import { createQueryKeys, mergeQueryKeys } from '@lukemorales/query-key-factory';
import { and, desc, eq, isNull } from 'drizzle-orm';

import { db } from '~/db/client';
import { getNodeByPath } from '~/db/queries/nodes';
import * as schema from '~/db/schema';

function getChildrenByNodeId(nodeId: null | string): Promise<schema.TNode[]> {
	return db
		.select()
		.from(schema.nodes)
		.where(nodeId === null ? isNull(schema.nodes.parentId) : eq(schema.nodes.parentId, nodeId));
}

async function getMaxTaskIndexByNodeId(nodeId: string): Promise<number> {
	const [row] = await db
		.select({ index: schema.tasks.index })
		.from(schema.tasks)
		.where(and(eq(schema.tasks.deleted, false), eq(schema.tasks.nodeId, nodeId)))
		.orderBy(desc(schema.tasks.index))
		.limit(1);
	return row?.index ?? 0;
}

async function getNodeById(id: string): Promise<schema.TNode | undefined> {
	const [node] = await db.select().from(schema.nodes).where(eq(schema.nodes.id, id));
	return node;
}

async function getNodeByNameAndParentId({
	name,
	parentId
}: {
	name: string;
	parentId: null | string;
}): Promise<schema.TNode | undefined> {
	const [node] = await db
		.select()
		.from(schema.nodes)
		.where(
			and(
				eq(schema.nodes.name, name),
				parentId === null ? isNull(schema.nodes.parentId) : eq(schema.nodes.parentId, parentId)
			)
		);
	return node;
}

const tasks = createQueryKeys('tasks', {
	byNodeId: (nodeId: string | undefined) => ({
		queryKey: [nodeId],
		queryFn: () => {
			if (nodeId === undefined) throw new Error('nodeId was undefined');
			return db
				.select()
				.from(schema.tasks)
				.where(and(eq(schema.tasks.deleted, false), eq(schema.tasks.nodeId, nodeId)))
				.orderBy(schema.tasks.index);
		},
		contextQueries: {
			maxIndex: {
				queryKey: null,
				queryFn: () => {
					if (nodeId === undefined) throw new Error('nodeId was undefined');
					return getMaxTaskIndexByNodeId(nodeId);
				}
			}
		}
	})
});

const nodes = createQueryKeys('nodes', {
	byId: ({ id, includeChildren = false }: { id: string; includeChildren?: boolean }) => ({
		queryKey: [id, { includeChildren }],
		queryFn: () => getNodeById(id)
	}),
	byNameAndParentId: ({
		name,
		parentId,
		includeChildren = false
	}: {
		includeChildren?: boolean;
		name: string;
		parentId: string;
	}) => ({
		queryKey: [{ name, parentId }, { includeChildren }],
		queryFn: () => getNodeByNameAndParentId({ name, parentId })
	}),
	byPath: ({ path, includeChildren = false }: { includeChildren?: boolean; path: string }) => ({
		queryKey: [path, { includeChildren }],
		queryFn: () => getNodeByPath(path, { includeChildren })
	})
});

export const queries = {
	...mergeQueryKeys(nodes, tasks),
	getNodeById,
	getNodeByNameAndParentId,
	getChildrenByNodeId,
	getMaxTaskIndexByNodeId
};
