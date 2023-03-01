import { IBaseModule, IWatcher, IQuery, IDatabase, Operation, ColumnType, ITableBuilder } from './expo.sql.wrapper.types'
import { createQueryResultType, validateTableName, Query, single, oEncypt, oDecrypt } from './SqlQueryBuilder'
import { TableBuilder } from './TableStructor'
import * as SQLite from 'expo-sqlite';
import { ResultSet } from 'expo-sqlite';

export default function <D extends string>(databaseTables: ITableBuilder<any, D>[], getDatabase: () => Promise<SQLite.WebSQLDatabase>, onInit?: (database: IDatabase<D>) => Promise<void>, disableLog?: boolean) {
    return new Database<D>(databaseTables, getDatabase, onInit, disableLog) as IDatabase<D>;
}

const watchers: IWatcher<any, string>[] = [];
class Watcher<T, D extends string> implements IWatcher<T, D> {
    tableName: D;
    onSave?: (item: T[], operation: Operation) => Promise<void>;
    onDelete?: (item: T[]) => Promise<void>;
    readonly removeWatch: () => void;
    constructor(tableName: D) {
        this.removeWatch = () => watchers.splice(watchers.findIndex(x => x == this), 1);
        this.tableName = tableName;
    }
}

class Database<D extends string> implements IDatabase<D> {
    private mappedKeys: Map<D, string[]>;
    private dataBase: () => Promise<SQLite.WebSQLDatabase>;
    private tables: TableBuilder<any, D>[];
    private timeout: any = undefined;
    private static dbIni: boolean = false;
    private onInit?: (database: IDatabase<D>) => Promise<void>;
    private db?: SQLite.WebSQLDatabase;
    public isClosed?: boolean;
    private isClosing: boolean;
    private isOpen: boolean;
    private timer: any;
    private transacting: boolean;
    private operations: Map<string, boolean>;
    private refresherSettings?: { ms: number } | undefined;
    private disableLog?: boolean;
    constructor(databaseTables: ITableBuilder<any, D>[],
        getDatabase: () => Promise<SQLite.WebSQLDatabase>,
        onInit?: (database: IDatabase<D>) => Promise<void>,
        disableLog?: boolean) {
        this.disableLog = disableLog;
        this.onInit = onInit;
        this.mappedKeys = new Map<D, string[]>();
        this.isClosing = false;
        this.timer = undefined;
        this.transacting = false;
        this.operations = new Map();
        this.dataBase = async () => {
            while (this.isClosing)
                await this.wait();
            if (this.db === undefined || this.isClosed) {
                this.db = await getDatabase();
                this.isClosed = false;
                await this.onInit?.(this);
            }
            this.isOpen = true;
            return this.db ?? await getDatabase();
        };
        this.tables = databaseTables as TableBuilder<any, D>[];
    }

    private log(...items: any[]) {
        if (!this.disableLog)
            console.log(items);
    }

    private info(...items: any[]) {
        if (!this.disableLog)
            console.info(items);
    }

    //#region private methods


    private resetRefresher() {
        if (this.refresherSettings) {
            this.startRefresher(this.refresherSettings.ms);
        }
    }

    private isLocked() {
        return this.transacting === true;
    }

    private async triggerWatch<T>(items: T | T[], operation: "onSave" | "onDelete", subOperation?: Operation, tableName?: D) {
        var tItems = Array.isArray(items) ? items : [items];
        var s = single(tItems) as any;
        if (!tableName && s && s.tableName)
            tableName = s.tableName
        if (!tableName)
            return;
        const w = watchers.filter(x => {
            var watcher = x as Watcher<T, D>;
            return watcher.tableName == tableName;
        }) as Watcher<T, D>[];


        for (var watcher of w) {
            if (operation === "onSave" && watcher.onSave)
                await watcher.onSave(tItems, subOperation ?? "INSERT");

            if (operation === "onDelete" && watcher.onDelete)
                await watcher.onDelete(tItems);
        }
    }

    private localSave<T>(item?: IBaseModule<D>, insertOnly?: Boolean, tableName?: D, saveAndForget?: boolean) {
        validateTableName(item, tableName);
        const key = "localSave" + item.tableName;
        return new Promise(async (resolve, reject) => {
            try {
                if (!item) {
                    reject(undefined);
                    return;
                }

                this.operations.set(key, true);
                this.log('Executing Save...');
                const uiqueItem = await this.getUique(item);
                const keys = (await this.allowedKeys(item.tableName, true)).filter((x) => Object.keys(item).includes(x));
                const sOperations = uiqueItem ? "UPDATE" : "INSERT";
                let query = '';
                let args = [] as any[];
                oEncypt(item);
                if (uiqueItem) {
                    if (insertOnly) {
                        resolve(item as any);
                        return;
                    }
                    query = `UPDATE ${item.tableName} SET `;
                    keys.forEach((k, i) => {
                        query += ` ${k}=? ` + (i < keys.length - 1 ? ',' : '');
                    });
                    query += ' WHERE id=?';
                } else {
                    query = `INSERT INTO ${item.tableName} (`;
                    keys.forEach((k, i) => {
                        query += k + (i < keys.length - 1 ? ',' : '');
                    });
                    query += ') values(';
                    keys.forEach((k, i) => {
                        query += '?' + (i < keys.length - 1 ? ',' : '');
                    });
                    query += ')';
                }
                keys.forEach((k: string, i) => {
                    let v = (item as any)[k] ?? null;
                    if (v && v instanceof Date)
                        v = v.toISOString();
                    if (typeof v === "boolean")
                        v = v === true ? 1 : 0;
                    args.push(v);
                });
                if (uiqueItem)
                    item.id = uiqueItem.id;
                if (uiqueItem != undefined)
                    args.push(uiqueItem.id);
                await this.execute(query, args);
                if (saveAndForget !== true || (item.id === 0 || item.id === undefined)) {
                    const lastItem = ((await this.selectLastRecord<IBaseModule<D>>(item)) ?? item);
                    item.id = lastItem.id;
                }
                oDecrypt(item);
                this.operations.delete(key);
                await this.triggerWatch(item, "onSave", sOperations, tableName);
                resolve(item as any as T);
            } catch (error) {
                console.error(error, item);
                reject(error);
                this.operations.delete(key);
            }
        }) as Promise<T | undefined>;
    }

    private async localDelete(items: IBaseModule<D>[], tableName: string) {
        const key = "localDelete" + tableName;
        this.operations.set(key, true);
        var q = `DELETE FROM ${tableName} WHERE id IN (${items.map(x => "?").join(",")})`;
        await this.execute(q, items.map(x => x.id));
        this.operations.delete(key);

    }

    private async getUique(item: IBaseModule<D>) {
        if (item.id != undefined && item.id > 0)
            return single<IBaseModule<D>>(await this.where<IBaseModule<D>>(item.tableName, { id: item.id }));
        this.log('Executing getUique...');
        const trimValue = (value: any) => {
            if (typeof value === "string")
                return (value as string).trim();
            return value;
        }

        var filter = {} as any;
        var addedisUnique = false;
        var table = this.tables.find(x => x.tableName === item.tableName);
        if (table)
            table.props.filter(x => x.isUnique === true).forEach(x => {
                var anyItem = item as any;
                var columnName = x.columnName as string
                if (anyItem[columnName] !== undefined && anyItem[columnName] !== null) {
                    filter[columnName] = trimValue(anyItem[columnName]);
                    addedisUnique = true;
                }
            });

        if (!addedisUnique)
            return undefined;

        return single<IBaseModule<D>>(await this.where<IBaseModule<D>>(item.tableName, filter));
    }

    private async selectLastRecord<T>(item: IBaseModule<D>) {
        this.log('Executing SelectLastRecord... ');
        if (!item.tableName) {
            this.log('TableName cannot be empty for:', item);
            return;
        }
        return single(((await this.find(!item.id || item.id <= 0 ? `SELECT * FROM ${item.tableName} ORDER BY id DESC LIMIT 1;` : `SELECT * FROM ${item.tableName} WHERE id=?;`, item.id && item.id > 0 ? [item.id] : undefined, item.tableName))).map((x: any) => { x.tableName = item.tableName; return x; })) as T | undefined
    }

    private wait(ms?: number) {
        return new Promise<void>((resolve, reject) => setTimeout(resolve, ms ?? 100));
    }

    //#endregion

    //#region public Methods for Select

    public async beginTransaction() {
        this.resetRefresher();
        if (this.transacting)
            return;
        this.info("creating transaction");
        await this.execute("begin transaction");
        this.transacting = true;
    }

    public async commitTransaction() {
        this.resetRefresher();
        if (!this.transacting)
            return;
        this.info("commiting transaction");
        await this.execute("commit");
        this.transacting = false;
    }

    public async rollbackTransaction() {
        this.resetRefresher();
        if (!this.transacting)
            return;
        this.info("rollback transaction");
        await this.execute("rollback");
        this.transacting = false;
    }

    public startRefresher(ms: number) {
        if (this.timer)
            clearInterval(this.timer);
        this.refresherSettings = { ms };
        this.timer = setInterval(async () => {
            if (this.isClosing || this.isClosed)
                return;
            this.info("db refresh:", await this.tryToClose());
        }, ms)
    }

    public async close() {
        const db = this.db as any;
        if (db && db.closeAsync != undefined) {
            await db.closeAsync();
            this.isOpen = false;
            this.isClosed = true;
            this.db = undefined;
            this.isClosing = false;
        }
    }

    public async tryToClose() {
        let r = false;
        try {
            const db = this.db as any;
            if (!this.db || !this.isOpen)
                return false;
            if (db.closeAsync === undefined)
                throw "Cant close the database, name cant be undefined"

            if (this.isLocked() || this.operations.size > 0)
                return false;

            this.isClosing = true;
            await db.closeAsync();
            r = true;
            return true;
        } catch (e) {
            console.error(e);
            return false;
        } finally {
            if (r) {
                this.isOpen = false;
                this.isClosed = true;
                this.db = undefined;
            }
            this.isClosing = false;
        }
    }

    public allowedKeys = async (tableName: D, fromCachedKyes?: boolean) => {
        if (fromCachedKyes === true && this.mappedKeys.has(tableName))
            return this.mappedKeys.get(tableName);
        return new Promise(async (resolve, reject) => {
            (await this.dataBase()).exec([{ sql: `PRAGMA table_info(${tableName})`, args: [] }], true, (error, result) => {
                try {
                    if (error) {
                        console.error(error);
                        reject(error);
                        return;
                    }
                    if (single<any>(result)?.error) {
                        console.error(single<any>(result)?.error);
                        reject(single<any>(result)?.error);
                        return;
                    }
                    const data = result as ResultSet[]
                    var keys = [] as string[];
                    for (var i = 0; i < data.length; i++) {
                        for (let r = 0; r < data[i].rows.length; r++) {
                            if (data[i].rows[r].name != 'id')
                                keys.push(data[i].rows[r].name);
                        }
                    }
                    this.mappedKeys.set(tableName, keys);
                    resolve(keys)
                } catch (e) {
                    console.error(e);
                    reject(e);
                }
            });
        }) as Promise<string[]>;
    };

    public watch<T>(tableName: D) {
        var watcher = new Watcher<T, D>(tableName) as IWatcher<T, D>;
        watchers.push(watcher);
        return watcher;
    }

    public async asQueryable<T>(item: (T & IBaseModule<D>), tableName?: D) {
        validateTableName(item, tableName);
        var db = this as IDatabase<D>
        return await createQueryResultType<T, D>(item as any, db);

    }

    public query<T>(tableName: D) {
        var db = this as IDatabase<D>
        return ((new Query<T, D>(tableName, db)) as IQuery<T, D>);
    }

    public async save<T>(items: (T & IBaseModule<D>) | ((T & IBaseModule<D>)[]), insertOnly?: Boolean, tableName?: D, saveAndForget?: boolean) {
        const tItems = Array.isArray(items) ? items : [items];
        try {
            var returnItem = [] as T[];
            for (var item of tItems) {
                returnItem.push(await this.localSave<T>(item, insertOnly, tableName, saveAndForget) ?? item as any);
            }
            return returnItem as T[];
        } catch (e) {
            console.error(e);
            throw e;
        }
    }

    async delete(items: IBaseModule<D> | (IBaseModule<D>[]), tableName?: D) {
        try {
            var tItems = (Array.isArray(items) ? items : [items]).reduce((v, c) => {
                validateTableName(c, tableName);
                if (v[c.tableName])
                    v[c.tableName].push(c);
                else v[c.tableName] = [c];

                return v;
            }, {} as any);


            for (let key of Object.keys(tItems)) {
                await this.localDelete(tItems[key], key);
                await this.triggerWatch(tItems[key], "onDelete", undefined, tableName);
            }

        } catch (e) {
            console.error(e);
            throw e;
        }

    }

    async where<T>(tableName: D, query?: any | T) {
        var q = `SELECT * FROM ${tableName} ${query ? 'WHERE ' : ''}`;
        var values = [] as any[];
        if (query && Object.keys(query).length > 0) {
            var keys = Object.keys(query);
            keys.forEach((x, i) => {
                var start = x.startsWith('$') ? x.substring(0, x.indexOf('-')).replace('-', '') : undefined;
                if (!start) {
                    q += x + '=? ' + (i < keys.length - 1 ? 'AND ' : '');
                    values.push(query[x]);
                } else {
                    if (start == '$in') {
                        var v = query[x] as [];
                        q += x.replace("$in-", "") + ' IN (';
                        v.forEach((item, index) => {
                            q += '?' + (index < v.length - 1 ? ', ' : '');
                            values.push(item);
                        });
                    }
                    q += ') ' + (i < keys.length - 1 ? 'AND ' : '');
                }
            });
        }
        return ((await this.find(q, values, tableName)) as any) as T[];
    }

    async find(query: string, args?: any[], tableName?: string) {
        const key = query + tableName;
        this.operations.set(key, true);
        return new Promise(async (resolve, reject) => {
            this.info('executing find:', query);
            (await this.dataBase()).exec([{ sql: query, args: args || [] }], true, (error, result) => {
                if (error) {
                    console.error('Could not execute query:', query, error);
                    reject(error);
                    this.operations.delete(key);
                    return;
                }
                if (single<any>(result)?.error) {
                    console.error('Could not execute query:', query, single<any>(result)?.error);
                    reject(single<any>(result)?.error);
                    this.operations.delete(key);
                    return;
                }
                const data = result as ResultSet[]
                const table = this.tables.find(x => x.tableName == tableName);
                const booleanColumns = table?.props.filter(x => x.columnType == "Boolean");
                const dateColumns = table?.props.filter(x => x.columnType == "DateTime");
                const translateKeys = (item: any) => {
                    if (!item || !table)
                        return item;
                    booleanColumns.forEach(column => {
                        var columnName = column.columnName as string
                        if (item[columnName] != undefined && item[columnName] != null) {
                            if (item[columnName] === 0 || item[columnName] === "0" || item[columnName] === false)
                                item[columnName] = false;
                            else item[columnName] = true;
                        }
                    });

                    dateColumns.forEach(column => {
                        var columnName = column.columnName as string
                        if (item[columnName] != undefined && item[columnName] != null && item[columnName].length > 0) {
                            try {
                                item[columnName] = new Date(item[columnName]);
                            } catch {
                                /// ignore
                            }
                        }
                    });
                    return item;
                }
                var items = [] as IBaseModule<D>[];
                for (var i = 0; i < data.length; i++) {
                    for (let r = 0; r < data[i].rows.length; r++) {
                        const item = data[i].rows[r];
                        if (tableName)
                            item.tableName = tableName;
                        const translatedItem = oDecrypt(translateKeys(item), table);
                        items.push((table && table.onItemCreate ? table.onItemCreate(translatedItem) : translatedItem));
                    }
                }
                this.operations.delete(key);
                resolve(items);
            });
        }) as Promise<IBaseModule<D>[]>;
    }

    executeRawSql = async (queries: SQLite.Query[], readOnly: boolean) => {
        const key = "executeRawSql" + JSON.stringify(queries);
        this.operations.set(key, true);
        return new Promise(async (resolve, reject) => {
            try {
                (await this.dataBase()).exec(queries, readOnly, (error, result) => {

                    if (error) {
                        console.error("SQL Error", error);
                        reject(error);
                    } else resolve();
                })
            } catch (e) {
                console.error(e);
                reject(e);
            } finally {
                this.operations.delete(key);
            }
        }) as Promise<void>;
    }

    execute = async (query: string, args?: any[]) => {
        const key = "execute" + query;
        this.operations.set(key, true);
        return new Promise(async (resolve, reject) => {
            try {
                this.info('Executing Query:' + query);
                await this.executeRawSql([{ sql: query, args: args || [] }], false);
                this.info("Quary executed")
                resolve(true);
            } catch (e) {
                console.error('Could not execute query:', query, args, e);
                reject(e);
            } finally {
                this.operations.delete(key);
                clearTimeout(this.timeout);
            }
        }) as Promise<boolean>;
    };

    //#endregion

    //#region TableSetup
    public async tableHasChanges<T extends object>(item: ITableBuilder<T, D>) {
        const tbBuilder = item as TableBuilder<T, D>;
        var appSettingsKeys = await this.allowedKeys(tbBuilder.tableName);
        return appSettingsKeys.filter(x => x != "id").length != tbBuilder.props.filter(x => x.columnName != "id").length || tbBuilder.props.filter(x => x.columnName != "id" && !appSettingsKeys.find(a => a == x.columnName)).length > 0;
    }


    public dropTables = async () => {
        try {
            for (var x of this.tables) {
                await this.execute(`DROP TABLE if exists ${x.tableName}`);
            }
            await this.setUpDataBase(true);
        } catch (e) {
            console.error(e)
        }
    };

    setUpDataBase = async (forceCheck?: boolean) => {
        try {

            if (!Database.dbIni || forceCheck) {
                await this.beginTransaction();
                const dbType = (columnType: ColumnType) => {
                    if (columnType == "Boolean" || columnType == "Number")
                        return "INTEGER";
                    if (columnType == "Decimal")
                        return "REAL";
                    return "TEXT";
                }
                this.log(`dbIni= ${Database.dbIni}`);
                this.log(`forceCheck= ${forceCheck}`);
                this.log("initilize database table setup");
                for (var table of this.tables) {
                    var query = `CREATE TABLE if not exists ${table.tableName} (`;
                    table.props.forEach((col, index) => {
                        query += `${col.columnName.toString()} ${dbType(col.columnType)} ${!col.nullable ? "NOT NULL" : ""} ${col.isPrimary ? "UNIQUE" : ""},\n`
                    });
                    table.props.filter(x => x.isPrimary === true).forEach((col, index) => {
                        query += `PRIMARY KEY(${col.columnName.toString()} ${col.isAutoIncrement === true ? "AUTOINCREMENT" : ""})` + (index < table.props.filter(x => x.isPrimary === true).length - 1 ? ",\n" : "\n");
                    });

                    if (table.constrains && table.constrains.length > 0) {
                        query += ",";
                        table.constrains.forEach((col, index) => {
                            query += `CONSTRAINT "fk_${col.columnName.toString()}" FOREIGN KEY(${col.columnName.toString()}) REFERENCES ${col.contraintTableName}(${col.contraintColumnName})` + (index < (table.constrains?.length ?? 0) - 1 ? ",\n" : "\n");
                        });
                    }
                    query += ");";
                    await this.execute(query);
                }
                await this.commitTransaction();
            }

        } catch (e) {
            console.error(e);
            await this.rollbackTransaction();
            throw e;
        }
    }

    //#endregion TableSetup

}