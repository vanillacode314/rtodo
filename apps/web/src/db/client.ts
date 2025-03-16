import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { HLC } from 'hlc';
import { SQLocalDrizzle } from 'sqlocal/drizzle';

import { getLocalClock } from '~/utils/clock';
import { debounce } from '~/utils/timer';

import migrations from './migrations.json';
import * as schema from './schema';

const {
	getDatabaseInfo,
	createCallbackFunction,
	transaction,
	driver,
	batchDriver,
	deleteDatabaseFile,
	beginTransaction
} = new SQLocalDrizzle({
	databasePath: 'local.db',
	onInit: (sql) => [
		sql`PRAGMA journal_mode=MEMORY;`,
		sql`CREATE TABLE IF NOT EXISTS \`metadata\` ( \`key\` text PRIMARY KEY NOT NULL, \`value\` text NOT NULL);`
	]
	// verbose: import.meta.env.DEV
});

const db = drizzle(driver, batchDriver, {
	schema
	//logger: {
	//	logQuery(query, params) {
	//		console.trace(query, params);
	//	}
	//}
});

async function runMigrations() {
	// return deleteDatabaseFile();
	console.log('[Database Info]', await getDatabaseInfo());
	const allVersions = Object.keys(migrations).sort();
	const [currentVersion] = await db
		.select({ value: schema.metadata.value })
		.from(schema.metadata)
		.where(eq(schema.metadata.key, 'version'));
	const migrationsToRun = Object.entries(migrations)
		.filter(([version]) => {
			return currentVersion === undefined ? true : version > currentVersion.value;
		})
		.map(([_, migration]) => migration);
	if (migrationsToRun.length === 0) return;

	// @ts-ignore: typescript cannot tell that migrationsToRun.length is always > 0
	await db.batch([
		...migrationsToRun.map((migration) => db.run(sql.raw(migration.trim()))),
		db
			.insert(schema.metadata)
			.values({ key: 'version', value: allVersions.at(-1)! })
			.onConflictDoUpdate({
				target: schema.metadata.key,
				set: { value: allVersions.at(-1) }
			})
	]);
}

let called = false;
async function setupDb() {
	if (called) return;
	called = true;
	await createCallbackFunction(
		'push',
		debounce(async () => {
			const { pushWs } = await import('~/sockets/messages');
			pushWs();
		}, 500)
	);
	await runMigrations();
	let clock = HLC.generate();
	await db
		.insert(schema.metadata)
		.values({ key: 'clock', value: clock.toString() })
		.onConflictDoNothing({ target: schema.metadata.key });
	clock = await getLocalClock();
	await db
		.insert(schema.metadata)
		.values({ key: 'clientId', value: clock.clientId })
		.onConflictDoNothing({ target: schema.metadata.key });
	await db
		.insert(schema.nodes)
		.values({
			id: '__root__',
			name: 'root',
			parentId: null,
			createdAt: clock.toString(),
			updatedAt: clock.toString()
		})
		.onConflictDoNothing({
			target: schema.nodes.id
		});
	await db.batch([
		db.run(
			sql`CREATE TEMP TRIGGER on_insert_message AFTER INSERT ON "messages" WHEN NEW.createdAt LIKE '%${sql.raw(clock.clientId)}' BEGIN SELECT push(); END;`
		),
		db.run(
			sql`CREATE TEMP TRIGGER on_delete_node_1 UPDATE OF "deleted" ON "nodes" WHEN NEW.deleted = 1 BEGIN UPDATE "nodes" SET deleted = 1 WHERE parentId = NEW.id; END;`
		),
		db.run(
			sql`CREATE TEMP TRIGGER on_delete_node_2 UPDATE OF "deleted" ON "nodes" WHEN NEW.deleted = 1 BEGIN UPDATE "tasks" SET deleted = 1 WHERE nodeId = NEW.id; END;`
		)
	]);
}

await setupDb().then(
	() => console.log('[Finished DB Setup]'),
	(error) => console.error('[Failed DB Setup]', error)
);

export { beginTransaction, db, deleteDatabaseFile, getDatabaseInfo, setupDb, transaction };
