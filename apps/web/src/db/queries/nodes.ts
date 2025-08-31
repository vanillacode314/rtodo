import { type } from 'arktype';
import { SQL, sql } from 'drizzle-orm';

import { db } from '~/db/client';
import { nodes, nodesSchema, type TNode } from '~/db/schema';
import { runCustomQuery } from '~/utils/db';

export const nodesPathCte = () =>
	sql`WITH RECURSIVE
    PATH_CTE AS (
      SELECT
        ${nodes.id},
        ${nodes.name} AS path
      FROM
        ${nodes}
      WHERE
        ${nodes.parentId} IS NULL
        AND deleted = 0
      UNION ALL
      SELECT
        n.id,
        path || '/' || n.name
      FROM
        ${nodes} n
        JOIN PATH_CTE ON n.parentId = PATH_CTE.id
    )`;

export async function getNodeByPath(
	path: string,
	{
		includeChildren = false,
		orderBy = ''
	}: Partial<{ includeChildren: boolean; orderBy: string }> = {}
): Promise<TNode[]> {
	path = path === '/' ? 'root' : 'root' + path;

	const sqlChunks: SQL[] = [
		nodesPathCte(),
		sql`SELECT
				  *
				FROM
          ${nodes}
				WHERE
				  id = (
				    SELECT
				      id
				    FROM
				      PATH_CTE
				    WHERE
				      path = ${path}
              AND deleted = 0
				  )`
	];

	if (includeChildren) {
		sqlChunks.push(
			sql`UNION ALL
				SELECT 
					* 
				FROM 
          (SELECT * FROM ${nodes} ${sql.raw(orderBy ? `ORDER BY ${orderBy}` : '')})
				WHERE 
					parentId = (
				    SELECT
				      id
				    FROM
				      PATH_CTE
				    WHERE
				      path = ${path}
				  ) AND deleted = 0
					`
		);
	}
	const query = sql.join(sqlChunks, sql.raw(' '));
	const rows = await runCustomQuery(query);
	return nodesSchema.array().assert(rows);
}

export async function getPathByNodeId(id: string): Promise<null | string> {
	const query = sql`WITH RECURSIVE
        CTE AS (
          SELECT
            1 AS n,
            name,
            parentId,
            name AS path
          FROM
            nodes
          WHERE
            id = ${id}
          UNION ALL
          SELECT
            CTE.n + 1,
            n.name,
            n.parentId,
            n.name || '/' || CTE.path AS path
          FROM
            nodes n
            JOIN CTE ON n.id = CTE.parentId
        )
      SELECT
        '/' || path AS path
      FROM CTE
      ORDER BY
        n DESC
      LIMIT
        1;`;

	const [path] = (await db.get<{ path: string }>(query)) as unknown as [null | string];
	if (path === null) return null;
	return path === '/root' ? '/' : path.slice('/root'.length);
}
