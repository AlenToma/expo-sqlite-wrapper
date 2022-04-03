import { IBaseModule, IWatcher, IQuery, IDatabase, Operation } from './expo.sql.wrapper.types'
import { createQueryResultType, validateTableName, Query, single } from './SqlQueryBuilder'
import TablaStructor, { ColumnType } from './TableStructor'
import * as SQLite from 'expo-sqlite';


export default function <D extends string>(databaseTables: TablaStructor<any, D>[], getDatabase: () => Promise<SQLite.WebSQLDatabase>, onInit?: (database: IDatabase<D>) => Promise<void>) {
    return new Database<D>(databaseTables, getDatabase, onInit) as IDatabase<D>;
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
    private working: boolean;
    private isClosing: boolean;
    private isOpen: boolean;
    private timer: any;
    constructor(databaseTables: TablaStructor<any, D>[], getDatabase: () => Promise<SQLite.WebSQLDatabase>, onInit?: (database: IDatabase<D>) => Promise<void>) {
        this.onInit = onInit;
        this.mappedKeys = new Map<D, string[]>();
        this.working = false;
        this.isClosing = false;
        this.timer = undefined;
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

    //#region private methods

    private isLocked() {
        return this.working === true;
    }

    private lock() {
        this.working = true;
    }

    private async unlock() {
        this.working = false;
        if (this.isClosing)
            await this.wait();
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
        return new Promise(async (resolve, reject) => {
            try {
                if (!item) {
                    reject(undefined);
                    return;
                }
                validateTableName(item, tableName);
                console.log('Executing Save...');
                const uiqueItem = await this.getUique(item);
                const keys = (await this.allowedKeys(item.tableName, true)).filter((x) => Object.keys(item).includes(x));
                await this.triggerWatch(item, "onSave", uiqueItem ? "UPDATE" : "INSERT", tableName);
                let query = '';
                let args = [] as any[];
                if (uiqueItem) {
                    if (insertOnly) return;
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
                if (uiqueItem != undefined)
                    args.push(uiqueItem.id);
                await this.execute(query, args);
                if (saveAndForget !== true || (item.id === 0 || item.id === undefined)) {
                    const lastItem = ((await this.selectLastRecord<IBaseModule<D>>(item)) ?? item);
                    item.id = lastItem.id;
                    resolve(lastItem as any as T);
                } else resolve(item as any as T);
            } catch (error) {
                console.log(error);
                console.log(item)
                reject(error);
            }
        }) as Promise<T | undefined>;
    }

    private async localDelete(items: IBaseModule<D>[], tableName: string) {
        var q = `DELETE FROM ${tableName} WHERE id IN (${items.map(x => "?").join(",")})`;
        await this.execute(q, items.map(x => x.id));

    }

    private async getUique(item: IBaseModule<D>) {
        if (item.id != undefined && item.id > 0)
            return single<IBaseModule<D>>(await this.where<IBaseModule<D>>(item.tableName, { id: item.id }));
        console.log('Executing getUique...');
        const trimValue = (value: any) => {
            if (typeof value === "string")
                return (value as string).trim();
            return value;
        }

        var filter = {} as any;
        var addedisUique = false;
        var table = this.tables.find(x => x.tableName === item.tableName);
        if (table)
            table.columns.filter(x => x.isUique === true).forEach(x => {
                var anyItem = item as any;
                var columnName = x.columnName as string
                if (anyItem[columnName] !== undefined && anyItem[columnName] !== null) {
                    filter[columnName] = trimValue(anyItem[columnName]);
                    addedisUique = true;
                }
            });

        if (!addedisUique)
            return undefined;

        return single<IBaseModule<D>>(await this.where<IBaseModule<D>>(item.tableName, filter));
    }

    private async selectLastRecord<T>(item: IBaseModule<D>) {
        console.log('Executing SelectLastRecord... ');
        if (!item.tableName) {
            console.log('TableName cannot be empty for:');
            console.log(item);
            return;
        }
        return single(((await this.find(!item.id || item.id <= 0 ? `SELECT * FROM ${item.tableName} ORDER BY id DESC LIMIT 1;` : `SELECT * FROM ${item.tableName} WHERE id=?;`, item.id && item.id > 0 ? [item.id] : undefined, item.tableName))).map((x: any) => { x.tableName = item.tableName; return x; })) as T | undefined
    }

    private wait(ms?: number) {
        return new Promise<void>((resolve, reject) => setTimeout(resolve, ms ?? 100));
    }

    //#endregion

    //#region public Methods for Select

    public startRefresher(ms: number, dbName: string) {
        if (this.timer)
            clearInterval(this.timer);
        this.timer = setInterval(async () => {
            if (this.isClosing || this.isClosed)
                return;
            console.info("db refresh:", await this.tryToClose(dbName));
        }, ms)
    }

    public async tryToClose(name: string) {
        try {

            if (!this.db || !this.isOpen)
                return false;

            if (name === undefined || name == "")
                throw "Cant close the database, name cant be undefined"
            if (typeof require === 'undefined') {
                console.log("require is undefined");
                return false;
            }
            //import { NativeModulesProxy } from 'expo-modules-core';
            // const { ExponentSQLite } = NativeModulesProxy;
            const { NativeModulesProxy } = require("expo-modules-core");
            if (NativeModulesProxy == undefined) {
                console.log("Could not find NativeModulesProxy in expo-modules-core")
                return false;
            }

            const { ExponentSQLite } = NativeModulesProxy;
            if (ExponentSQLite == undefined || ExponentSQLite.close == undefined) {
                console.log("Could not find (ExponentSQLite or ExponentSQLite.close) in NativeModulesProxy in expo-modules-core")
                return false;
            }

            const repeate = await this.isLocked();
            while (await this.isLocked()) {

                await this.wait(1000);
            }
            if (repeate) {
                console.log("Cannot close, The database is locked", "Try another time");
                return false; // wait to close the db another time

            }
            this.isClosing = true;
            await ExponentSQLite.close(name);
            return true;
        } catch (e) {
            if (console.error)
                console.error(e);
            return false;
        } finally {
            this.isOpen = false;
            this.isClosed = true;
            this.db = undefined;
            this.isClosing = false;
        }
    }

    public allowedKeys = async (tableName: D, fromCachedKyes?: boolean) => {
        if (fromCachedKyes === true && this.mappedKeys.has(tableName))
            return this.mappedKeys.get(tableName);
        this.lock();
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
                            this.unlock().then(x => resolve(keys));
                        },
                    ),
                (error) => {
                    this.unlock().then(x => reject(error));
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
        var tItems = Array.isArray(items) ? items : [items];
        var returnItem = [] as T[];
        for (var item of tItems) {
            returnItem.push(await this.localSave<T>(item, insertOnly, tableName, saveAndForget) ?? item as any);
        }
        return returnItem as T[];
    }

    async delete(items: IBaseModule<D> | (IBaseModule<D>[]), tableName?: D) {
        var tItems = (Array.isArray(items) ? items : [items]).reduce((v, c) => {
            validateTableName(c, tableName);
            if (v[c.tableName])
                v[c.tableName].push(c);
            else v[c.tableName] = [c];

            return v;
        }, {} as any);


        for (var key of Object.keys(tItems)) {
            await this.localDelete(tItems[key], key);
            await this.triggerWatch(tItems[key], "onDelete", undefined, tableName);
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
        this.lock();
        return new Promise(async (resolve, reject) => {
            (await this.dataBase()).readTransaction(
                async (x) => {
                    console.log('Executing Find..');
                    x.executeSql(
                        query,
                        args,
                        async (trans, data) => {
                            const table = this.tables.find(x => x.tableName == tableName);
                            const booleanColumns = table?.columns.filter(x => x.columnType == ColumnType.Boolean);
                            console.info('query executed:', query);
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
                            this.unlock().then(x => resolve(items))
                        },
                        (_ts, error) => {
                            console.error('Could not execute query:', query, error);
                            this.unlock().then(x => reject(error));
                            return false;
                        },
                    );
                },
                (error) => {
                    console.log('Could not execute query:' + query);
                    console.log(error);
                    this.unlock().then(x => reject(error))
                },
            );
        }) as Promise<IBaseModule<D>[]>;
    }

    executeRawSql = async (queries: SQLite.Query[], readOnly: boolean) => {
        this.lock();
        return new Promise(async (resolve, reject) => {
            (await this.dataBase()).exec(queries, readOnly, (error, result) => {
                this.unlock().then(() => {
                    if (error) {
                        console.log("SQL Error", error);
                        reject(error);
                    } else resolve();
                });

            })
        }) as Promise<void>;
    }

    execute = async (query: string, args?: any[]) => {
        this.lock();
        return new Promise(async (resolve, reject) => {
            (await this.dataBase()).transaction(
                (tx) => {
                    console.log('Executing Query:' + query);
                    tx.executeSql(query, args);
                },
                (error) => {
                    console.error('Could not execute query:', query, args, error);
                    this.unlock().then(() => reject(error))
                    reject(error);
                },
                () => {
                    console.log('Statment has been executed....' + query);
                    clearTimeout(this.timeout);
                    this.unlock().then(() => resolve(true));
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
        for (var x of this.tables) {
            await this.execute(`DROP TABLE if exists ${x.tableName}`);
        }
        await this.setUpDataBase(true);
    };

    setUpDataBase = async (forceCheck?: boolean) => {
        if (!Database.dbIni || forceCheck) {
            const dbType = (columnType: ColumnType) => {
                if (columnType == ColumnType.Boolean || columnType == ColumnType.Number)
                    return "INTEGER";
                if (columnType == ColumnType.Decimal)
                    return "REAL";
                return "TEXT";
            }
            console.log(`dbIni= ${Database.dbIni}`);
            console.log(`forceCheck= ${forceCheck}`);
            console.log("initilize database table setup");
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
        }
    }

    //#endregion TableSetup

}