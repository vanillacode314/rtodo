import { queryOptions } from '@tanstack/solid-query';
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

const tasks = {
	all: () => ['tasks'],
	byNodeId: (nodeId: string | undefined) => {
		const query = queryOptions({
			queryKey: [...tasks.all(), 'byNodeId', nodeId],
			queryFn: () => {
				if (nodeId === undefined) throw new Error('nodeId was undefined');
				return db
					.select()
					.from(schema.tasks)
					.where(and(eq(schema.tasks.deleted, false), eq(schema.tasks.nodeId, nodeId)))
					.orderBy(schema.tasks.index);
			}
		});
		const contextQueries = {
			maxIndex: queryOptions({
				queryKey: [...query.queryKey, 'maxIndex'],
				queryFn: () => {
					if (nodeId === undefined) throw new Error('nodeId was undefined');
					return getMaxTaskIndexByNodeId(nodeId);
				}
			})
		};
		return Object.assign(query, { _ctx: contextQueries });
	}
};

const nodes = {
	all: () => ['nodes'],
	byId: (id: string, { includeChildren }: { includeChildren?: boolean } = {}) =>
		queryOptions({
			queryKey: [...nodes.all(), 'byId', id, { includeChildren }],
			queryFn: () => getNodeById(id)
		}),
	byNameAndParentId: (
		name: string,
		parentId: string,
		{ includeChildren }: { includeChildren?: boolean } = {}
	) =>
		queryOptions({
			queryKey: [...nodes.all(), 'byNameAndParentId', { name, parentId }, { includeChildren }],
			queryFn: () => getNodeByNameAndParentId({ name, parentId })
		}),
	byPath: (path: string, { includeChildren }: { includeChildren?: boolean } = {}) =>
		queryOptions({
			queryKey: [...nodes.all(), 'byPath', path, { includeChildren }],
			queryFn: () => getNodeByPath(path, { includeChildren })
		})
};

export const queries = {
	nodes,
	tasks,
	getNodeById,
	getNodeByNameAndParentId,
	getChildrenByNodeId,
	getMaxTaskIndexByNodeId
};
