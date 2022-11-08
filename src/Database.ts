import { IBaseModule, IWatcher, IQuery, IDatabase, Operation } from './expo.sql.wrapper.types'
import { createQueryResultType, validateTableName, Query, single } from './SqlQueryBuilder'
import TablaStructor, { ColumnType } from './TableStructor'
import * as SQLite from 'expo-sqlite';


export default function <D extends string>(databaseTables: TablaStructor<any, D>[], getDatabase: () => Promise<SQLite.WebSQLDatabase>, onInit?: (database: IDatabase<D>) => Promise<void>, disableLog?: boolean) {
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
    private tables: TablaStructor<any, D>[];
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
    constructor(databaseTables: TablaStructor<any, D>[],
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
        this.tables = databaseTables;
    }

    private log(...items: any[]) {
        if (!this.disableLog)
            this.log(items);
    }

    private info(...items: any[]) {
        if (!this.disableLog)
            this.info(items);
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
                await this.triggerWatch(item, "onSave", uiqueItem ? "UPDATE" : "INSERT", tableName);
                let query = '';
                let args = [] as any[];
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
                    args.push((item as any)[k] ?? null);
                });
                if (uiqueItem)
                    item.id = uiqueItem.id;
                if (uiqueItem != undefined)
                    args.push(uiqueItem.id);
                await this.execute(query, args);

                if (saveAndForget !== true || (item.id === 0 || item.id === undefined)) {
                    const lastItem = ((await this.selectLastRecord<IBaseModule<D>>(item)) ?? item);
                    item.id = lastItem.id;
                    resolve(lastItem as any as T);
                    this.operations.delete(key);
                } else {
                    resolve(item as any as T);
                    this.operations.delete(key);
                }
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
            table.columns.filter(x => x.isUnique === true).forEach(x => {
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
                this.isClosing = false;
            }
        }
    }

    public allowedKeys = async (tableName: D, fromCachedKyes?: boolean) => {
        if (fromCachedKyes === true && this.mappedKeys.has(tableName))
            return this.mappedKeys.get(tableName);
        return new Promise(async (resolve, reject) => {
            (await this.dataBase()).readTransaction(
                (x) =>
                    x.executeSql(
                        `PRAGMA table_info(${tableName})`,
                        undefined,
                        (trans, data) => {
                            var keys = [] as string[];
                            for (var i = 0; i < data.rows.length; i++) {
                                if (data.rows.item(i).name != 'id')
                                    keys.push(data.rows.item(i).name);
                            }
                            this.mappedKeys.set(tableName, keys);
                            resolve(keys)
                        },
                    ),
                (error) => {
                    reject(error)
                },
            );
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
        let throwError = !this.isLocked() && tItems.length > 1;
        try {
            if (throwError)
                await this.beginTransaction();

            var returnItem = [] as T[];
            for (var item of tItems) {
                returnItem.push(await this.localSave<T>(item, insertOnly, tableName, saveAndForget) ?? item as any);
            }
            if (throwError)
                await this.commitTransaction();
            return returnItem as T[];
        } catch (e) {
            console.error(e);
            if (throwError)
                await this.rollbackTransaction();
            throw e;
        }
    }

    async delete(items: IBaseModule<D> | (IBaseModule<D>[]), tableName?: D) {
        let throwError = !this.isLocked();
        try {
            if (throwError)
                await this.beginTransaction();
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

            if (throwError)
                await this.commitTransaction();

        } catch (e) {
            console.error(e);
            if (throwError)
                await this.rollbackTransaction();
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
            (await this.dataBase()).readTransaction(
                async (x) => {
                    this.log('Executing Find..');
                    x.executeSql(
                        query,
                        args,
                        async (trans, data) => {
                            const table = this.tables.find(x => x.tableName == tableName);
                            const booleanColumns = table?.columns.filter(x => x.columnType == ColumnType.Boolean);
                            this.info('query executed:', query);
                            const translateKeys = (item: any) => {
                                if (!item || !booleanColumns || booleanColumns.length <= 0)
                                    return item;
                                booleanColumns.forEach(column => {
                                    var columnName = column.columnName as string
                                    if (item[columnName] != undefined && item[columnName] != null) {
                                        if (item[columnName] === 0 || item[columnName] === "0" || item[columnName] === false)
                                            item[columnName] = false;
                                        else item[columnName] = true;
                                    }

                                })
                                return item;
                            }
                            var items = [] as IBaseModule<D>[];
                            for (var i = 0; i < data.rows.length; i++) {
                                var item = data.rows.item(i);
                                if (tableName)
                                    item.tableName = tableName;
                                const translatedItem = translateKeys(item);
                                items.push((table && table.onItemCreate ? table.onItemCreate(translatedItem) : translatedItem));
                            }
                            this.operations.delete(key);
                            resolve(items);
                        },
                        (_ts, error) => {
                            console.error('Could not execute query:', query, error);
                            reject(error)
                            this.operations.delete(key);
                            return false
                        },
                    );
                },
                (error) => {
                    console.error('Could not execute query:', query, error);
                    this.operations.delete(key);
                    reject(error)
                },
            );
        }) as Promise<IBaseModule<D>[]>;
    }

    executeRawSql = async (queries: SQLite.Query[], readOnly: boolean) => {
        const key = "executeRawSql" + JSON.stringify(queries);
        this.operations.set(key, true);
        return new Promise(async (resolve, reject) => {
            (await this.dataBase()).exec(queries, readOnly, (error, result) => {
                this.operations.delete(key);
                if (error) {
                    console.error("SQL Error", error);
                    reject(error);
                } else resolve();

            })
        }) as Promise<void>;
    }

    execute = async (query: string, args?: any[]) => {
        const key = "execute" + query;
        this.operations.set(key, true);
        return new Promise(async (resolve, reject) => {
            (await this.dataBase()).transaction(
                (tx) => {
                    this.info('Executing Query:' + query);
                    tx.executeSql(query, args);
                },
                (error) => {
                    console.error('Could not execute query:', query, args, error);
                    this.operations.delete(key)
                    reject(error);
                },
                () => {
                    this.info('Statment has been executed....', query);
                    clearTimeout(this.timeout);
                    this.operations.delete(key)
                    resolve(true);
                });
        }) as Promise<boolean>;
    };

    //#endregion

    //#region TableSetup
    public async tableHasChanges<T>(item: TablaStructor<T, D>) {
        var appSettingsKeys = await this.allowedKeys(item.tableName);
        return appSettingsKeys.filter(x => x != "id").length != item.columns.filter(x => x.columnName != "id").length || item.columns.filter(x => x.columnName != "id" && !appSettingsKeys.find(a => a == x.columnName)).length > 0;
    }


    public dropTables = async () => {
        try {
            this.beginTransaction();
            for (var x of this.tables) {
                await this.execute(`DROP TABLE if exists ${x.tableName}`);
            }
            await this.setUpDataBase(true);
            await this.commitTransaction();
        } catch (e) {
            console.error(e)
            this.rollbackTransaction();
        }
    };

    setUpDataBase = async (forceCheck?: boolean) => {
        try {
            if (!Database.dbIni || forceCheck) {
                await this.beginTransaction();
                const dbType = (columnType: ColumnType) => {
                    if (columnType == ColumnType.Boolean || columnType == ColumnType.Number)
                        return "INTEGER";
                    if (columnType == ColumnType.Decimal)
                        return "REAL";
                    return "TEXT";
                }
                this.log(`dbIni= ${Database.dbIni}`);
                this.log(`forceCheck= ${forceCheck}`);
                this.log("initilize database table setup");
                for (var table of this.tables) {
                    var query = `CREATE TABLE if not exists ${table.tableName} (`;
                    table.columns.forEach((col, index) => {
                        query += `${col.columnName} ${dbType(col.columnType)} ${!col.nullable ? "NOT NULL" : ""} ${col.isPrimary ? "UNIQUE" : ""},\n`
                    });
                    table.columns.filter(x => x.isPrimary === true).forEach((col, index) => {
                        query += `PRIMARY KEY(${col.columnName} ${col.autoIncrement === true ? "AUTOINCREMENT" : ""})` + (index < table.columns.filter(x => x.isPrimary === true).length - 1 ? ",\n" : "\n");
                    });

                    if (table.constraints && table.constraints.length > 0) {
                        query += ",";
                        table.constraints.forEach((col, index) => {
                            query += `CONSTRAINT "fk_${col.columnName}" FOREIGN KEY(${col.columnName}) REFERENCES ${col.contraintTableName}(${col.contraintColumnName})` + (index < (table.constraints?.length ?? 0) - 1 ? ",\n" : "\n");
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
        }
    }

    //#endregion TableSetup

}