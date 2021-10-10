import { IBaseModule, IWatcher, SingleValue, ArrayValue, NumberValue, IChildQueryLoader, IChildLoader, IQuaryResult, IQuery, IQueryResultItem, IDatabase, Param } from './expo.sql.wrapper.types'
import { createQueryResultType, validateTableName, Query, single } from './SqlQueryBuilder'
import TablaStructor, { ColumnType } from './TableStructor'
import * as SQLite from 'expo-sqlite';

export default function <D extends string>(databaseTables: TablaStructor<D>[], getDatabase: () => Promise<SQLite.WebSQLDatabase>) {
    return new Database<D>(databaseTables, getDatabase) as IDatabase<D>;
}

class Watcher<T, D extends string> implements IWatcher<T, D> {
    tableName: D;
    onSave?: (item: T[]) => Promise<void>;
    onDelete?: (item: T[]) => Promise<void>;
    readonly removeWatch: () => void;
    constructor(tableName: D) {
        this.removeWatch = () => Database.watchers.splice(Database.watchers.findIndex(x => x == this), 1);
        this.tableName = tableName;
    }

}

class Database<D extends string> implements IDatabase<D> {
    private dataBase: () => Promise<SQLite.WebSQLDatabase>;
    private tables: TablaStructor<D>[];
    private timeout: any = undefined;
    private static dbIni: boolean = false;
    public static watchers: IWatcher<any, string>[] = [];
    constructor(databaseTables: TablaStructor<D>[], getDatabase: () => Promise<SQLite.WebSQLDatabase>) {
        this.dataBase = getDatabase;
        this.tables = databaseTables;
    }

    //#region private methods

    private async triggerWatch<T>(items: T | T[], operation: "onSave" | "onDelete", tableName?: D) {
        if (!tableName)
            return;
        var watchers = Database.watchers.filter(x => {
            var watcher = x as Watcher<T, D>;
            return watcher.tableName == tableName;
        }) as Watcher<T, D>[];
        var tItems = Array.isArray(items) ? items : [items];

        for (var watcher of watchers) {
            if (operation === "onSave")
                await watcher?.onSave(tItems);

            if (operation === "onDelete")
                await watcher?.onDelete(tItems);
        }
    }

    private localSave<T>(item?: IBaseModule<D>, insertOnly?: Boolean, tableName?: D) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!item) {
                    reject(undefined);
                    return;
                }
                validateTableName(item, tableName);
                console.log('Executing Save...');
                var uiqueItem = await this.getUique(item);
                var keys = (await this.allowedKeys(item.tableName)).filter((x) => Object.keys(item).includes(x));

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
                var lastItem = ((await this.selectLastRecord<IBaseModule<D>>(item)) ?? item);
                item.id = lastItem.id;
                resolve(lastItem as any as T);
            } catch (error) {
                console.log(error);
                console.log(item)
                reject(error);
            }
        }) as Promise<T | undefined>;
    }

    private async localDelete(item: any, tableName?: string) {
        validateTableName(item, tableName);
        tableName = item.tableName ?? tableName;
        var q = `DELETE FROM ${tableName} WHERE id=?`;
        await this.execute(q, [item.id]);
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
                if (anyItem[x.columnName] !== undefined && anyItem[x.columnName] !== null) {
                    filter[x.columnName] = trimValue(anyItem[x.columnName]);
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
        return single(((
            await this.find(!item.id || item.id <= 0 ? `SELECT * FROM ${item.tableName} ORDER BY id DESC LIMIT 1;` : `SELECT * FROM ${item.tableName} WHERE id=?;`, item.id && item.id > 0 ? [item.id] : undefined, item.tableName)
        )).map((x: any) => { x.tableName = item.tableName; return x; })) as T | undefined
    }

    //#endregion

    //#region public Methods for Select

    public allowedKeys = (tableName: D) => {
        return new Promise(async (resolve, reject) => {
            (await this.dataBase()).transaction(
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
                            resolve(keys);
                        },
                    ),
                (error) => {
                    reject(error);
                },
            );
        }) as Promise<string[]>;
    };

    public watch<T>(tableName: D) {
        var watcher = new Watcher<T, D>(tableName) as IWatcher<T, D>;
        Database.watchers.push(watcher);
        return watcher;
    }

    public async asQueryable<T>(item: IBaseModule<D>, tableName?: D) {
        validateTableName(item, tableName);
        var db = this as IDatabase<D>
        return await createQueryResultType<T, D>(item as any, db);

    }

    public query<T>(tableName: D) {
        var db = this as IDatabase<D>
        return ((new Query<T, D>(tableName, db)) as IQuery<T, D>);
    }

    public async save<T>(items: IBaseModule<D> | (IBaseModule<D>[]), insertOnly?: Boolean, tableName?: D) {
        var tItems = Array.isArray(items) ? items : [items];
        var returnItem = [] as T[];
        for (var item of tItems) {
            returnItem.push(await this.localSave<T>(item));
            await this.triggerWatch(item, "onSave", tableName);
        }
        return returnItem;
    }

    async delete(items: IBaseModule<D> | (IBaseModule<D>[]), tableName?: D) {
        var tItems = Array.isArray(items) ? items : [items];
        for (var item of tItems) {
            await this.localDelete(item);
            await this.triggerWatch(item, "onDelete", tableName);
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
        return new Promise(async (resolve, reject) => {
            (await this.dataBase()).transaction(
                async (x) => {
                    console.log('Executing Find..');
                    x.executeSql(
                        query,
                        args,
                        async (trans, data) => {
                            var booleanColumns = this.tables.find(x => x.tableName == tableName)?.columns.filter(x => x.columnType == ColumnType.Boolean);
                            console.log('query executed:' + query);
                            const translateKeys = (item: any) => {
                                if (!item || !booleanColumns || booleanColumns.length <= 0)
                                    return item;
                                booleanColumns.forEach(column => {
                                    if (item[column.columnName] != undefined && item[column.columnName] != null) {
                                        if (item[column.columnName] === 0 || item[column.columnName] === "0" || item[column.columnName] === false)
                                            item[column.columnName] = false;
                                        else item[column.columnName] = true;
                                    }

                                })
                                return item;
                            }
                            var items = [] as IBaseModule<D>[];
                            for (var i = 0; i < data.rows.length; i++) {
                                var item = data.rows.item(i);
                                if (tableName)
                                    item.tableName = tableName;
                                items.push(translateKeys(item));
                            }
                            resolve(items);
                        },
                        (_ts, error) => {
                            console.log('Could not execute query:' + query);
                            console.log(error);
                            reject(error);
                            return false;
                        },
                    );
                },
                (error) => {
                    console.log('Could not execute query:' + query);
                    console.log(error);
                    reject(error);
                },
            );
        }) as Promise<IBaseModule<D>[]>;
    }

    execute = async (query: string, args?: any[]) => {
        return new Promise(async (resolve, reject) => {
            (await this.dataBase()).transaction(
                (tx) => {
                    clearTimeout(this.timeout)
                    this.timeout = setTimeout(() => {
                        console.log("timed out")
                        reject("Query Timeout");
                    }, 2000);
                    console.log('Execute Query:' + query);
                    tx.executeSql(
                        query,
                        args,
                        (tx, results) => {
                            console.log('Statment has been executed....' + query);
                            clearTimeout(this.timeout)
                            resolve(true);
                        },
                        (_ts, error) => {
                            console.log('Could not execute query');
                            console.log(args);
                            console.log(error);
                            reject(error);
                            clearTimeout(this.timeout)
                            return false;
                        },
                    );
                },
                (error) => {
                    console.log('db executing statement, has been termineted');
                    console.log(args);
                    console.log(error);
                    reject(error);
                    clearTimeout(this.timeout)
                    throw 'db executing statement, has been termineted';
                },
            );
        }) as Promise<boolean>;
    };

    //#endregion

    //#region TableSetup
    public tableHasChanges = async (item: TablaStructor<D>) => {
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