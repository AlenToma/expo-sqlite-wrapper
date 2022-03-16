"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SqlQueryBuilder_1 = require("./SqlQueryBuilder");
const TableStructor_1 = require("./TableStructor");
function default_1(databaseTables, getDatabase, onInit) {
    return new Database(databaseTables, getDatabase, onInit);
}
exports.default = default_1;
const watchers = [];
class Watcher {
    constructor(tableName) {
        this.removeWatch = () => watchers.splice(watchers.findIndex(x => x == this), 1);
        this.tableName = tableName;
    }
}
class Database {
    constructor(databaseTables, getDatabase, onInit) {
        this.timeout = undefined;
        this.allowedKeys = (tableName) => {
            return new Promise(async (resolve, reject) => {
                (await this.dataBase()).readTransaction((x) => x.executeSql(`PRAGMA table_info(${tableName})`, undefined, (trans, data) => {
                    var keys = [];
                    for (var i = 0; i < data.rows.length; i++) {
                        if (data.rows.item(i).name != 'id')
                            keys.push(data.rows.item(i).name);
                    }
                    resolve(keys);
                }), (error) => {
                    reject(error);
                });
            });
        };
        this.executeRawSql = async (queries, readOnly) => {
            return new Promise(async (resolve, reject) => {
                (await this.dataBase()).exec(queries, readOnly, (error, result) => {
                    if (error) {
                        console.log("SQL Error", error);
                        reject(error);
                    }
                    else
                        resolve();
                });
            });
        };
        this.execute = async (query, args) => {
            return new Promise(async (resolve, reject) => {
                (await this.dataBase()).transaction((tx) => {
                    clearTimeout(this.timeout);
                    this.timeout = setTimeout(() => {
                        console.log("timed out");
                        reject("Query Timeout");
                    }, 2000);
                    console.log('Execute Query:' + query);
                    tx.executeSql(query, args, (tx, results) => {
                        console.log('Statment has been executed....' + query);
                        clearTimeout(this.timeout);
                        resolve(true);
                    }, (_ts, error) => {
                        console.log('Could not execute query');
                        console.log(args);
                        console.log(error);
                        reject(error);
                        clearTimeout(this.timeout);
                        return false;
                    });
                }, (error) => {
                    console.log('db executing statement, has been termineted');
                    console.log(args);
                    console.log(error);
                    reject(error);
                    clearTimeout(this.timeout);
                    throw 'db executing statement, has been termineted';
                });
            });
        };
        this.dropTables = async () => {
            for (var x of this.tables) {
                await this.execute(`DROP TABLE if exists ${x.tableName}`);
            }
            await this.setUpDataBase(true);
        };
        this.setUpDataBase = async (forceCheck) => {
            if (!Database.dbIni || forceCheck) {
                const dbType = (columnType) => {
                    if (columnType == TableStructor_1.ColumnType.Boolean || columnType == TableStructor_1.ColumnType.Number)
                        return "INTEGER";
                    if (columnType == TableStructor_1.ColumnType.Decimal)
                        return "REAL";
                    return "TEXT";
                };
                console.log(`dbIni= ${Database.dbIni}`);
                console.log(`forceCheck= ${forceCheck}`);
                console.log("initilize database table setup");
                for (var table of this.tables) {
                    var query = `CREATE TABLE if not exists ${table.tableName} (`;
                    table.columns.forEach((col, index) => {
                        query += `${col.columnName} ${dbType(col.columnType)} ${!col.nullable ? "NOT NULL" : ""} ${col.isPrimary ? "UNIQUE" : ""},\n`;
                    });
                    table.columns.filter(x => x.isPrimary === true).forEach((col, index) => {
                        query += `PRIMARY KEY(${col.columnName} ${col.autoIncrement === true ? "AUTOINCREMENT" : ""})` + (index < table.columns.filter(x => x.isPrimary === true).length - 1 ? ",\n" : "\n");
                    });
                    if (table.constraints && table.constraints.length > 0) {
                        query += ",";
                        table.constraints.forEach((col, index) => {
                            var _a, _b;
                            query += `CONSTRAINT "fk_${col.columnName}" FOREIGN KEY(${col.columnName}) REFERENCES ${col.contraintTableName}(${col.contraintColumnName})` + (index < ((_b = (_a = table.constraints) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) - 1 ? ",\n" : "\n");
                        });
                    }
                    query += ");";
                    await this.execute(query);
                }
            }
        };
        this.onInit = onInit;
        this.dataBase = async () => {
            var _a, _b;
            if (this.db === undefined || this.isClosed) {
                this.db = await getDatabase();
                this.isClosed = false;
                await ((_a = this.onInit) === null || _a === void 0 ? void 0 : _a.call(this, this));
            }
            return (_b = this.db) !== null && _b !== void 0 ? _b : await getDatabase();
        };
        this.tables = databaseTables;
    }
    async triggerWatch(items, operation, subOperation, tableName) {
        var tItems = Array.isArray(items) ? items : [items];
        var s = (0, SqlQueryBuilder_1.single)(tItems);
        if (!tableName && s && s.tableName)
            tableName = s.tableName;
        if (!tableName)
            return;
        const w = watchers.filter(x => {
            var watcher = x;
            return watcher.tableName == tableName;
        });
        for (var watcher of w) {
            if (operation === "onSave" && watcher.onSave)
                await watcher.onSave(tItems, subOperation !== null && subOperation !== void 0 ? subOperation : "INSERT");
            if (operation === "onDelete" && watcher.onDelete)
                await watcher.onDelete(tItems);
        }
    }
    localSave(item, insertOnly, tableName) {
        return new Promise(async (resolve, reject) => {
            var _a;
            try {
                if (!item) {
                    reject(undefined);
                    return;
                }
                (0, SqlQueryBuilder_1.validateTableName)(item, tableName);
                console.log('Executing Save...');
                var uiqueItem = await this.getUique(item);
                var keys = (await this.allowedKeys(item.tableName)).filter((x) => Object.keys(item).includes(x));
                await this.triggerWatch(item, "onSave", uiqueItem ? "UPDATE" : "INSERT", tableName);
                let query = '';
                let args = [];
                if (uiqueItem) {
                    if (insertOnly)
                        return;
                    query = `UPDATE ${item.tableName} SET `;
                    keys.forEach((k, i) => {
                        query += ` ${k}=? ` + (i < keys.length - 1 ? ',' : '');
                    });
                    query += ' WHERE id=?';
                }
                else {
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
                keys.forEach((k, i) => {
                    var _a;
                    args.push((_a = item[k]) !== null && _a !== void 0 ? _a : null);
                });
                if (uiqueItem != undefined)
                    args.push(uiqueItem.id);
                await this.execute(query, args);
                var lastItem = ((_a = (await this.selectLastRecord(item))) !== null && _a !== void 0 ? _a : item);
                item.id = lastItem.id;
                resolve(lastItem);
            }
            catch (error) {
                console.log(error);
                console.log(item);
                reject(error);
            }
        });
    }
    async localDelete(item, tableName) {
        var _a;
        (0, SqlQueryBuilder_1.validateTableName)(item, tableName);
        tableName = (_a = item.tableName) !== null && _a !== void 0 ? _a : tableName;
        var q = `DELETE FROM ${tableName} WHERE id=?`;
        await this.execute(q, [item.id]);
    }
    async getUique(item) {
        if (item.id != undefined && item.id > 0)
            return (0, SqlQueryBuilder_1.single)(await this.where(item.tableName, { id: item.id }));
        console.log('Executing getUique...');
        const trimValue = (value) => {
            if (typeof value === "string")
                return value.trim();
            return value;
        };
        var filter = {};
        var addedisUique = false;
        var table = this.tables.find(x => x.tableName === item.tableName);
        if (table)
            table.columns.filter(x => x.isUique === true).forEach(x => {
                var anyItem = item;
                var columnName = x.columnName;
                if (anyItem[columnName] !== undefined && anyItem[columnName] !== null) {
                    filter[columnName] = trimValue(anyItem[columnName]);
                    addedisUique = true;
                }
            });
        if (!addedisUique)
            return undefined;
        return (0, SqlQueryBuilder_1.single)(await this.where(item.tableName, filter));
    }
    async selectLastRecord(item) {
        console.log('Executing SelectLastRecord... ');
        if (!item.tableName) {
            console.log('TableName cannot be empty for:');
            console.log(item);
            return;
        }
        return (0, SqlQueryBuilder_1.single)(((await this.find(!item.id || item.id <= 0 ? `SELECT * FROM ${item.tableName} ORDER BY id DESC LIMIT 1;` : `SELECT * FROM ${item.tableName} WHERE id=?;`, item.id && item.id > 0 ? [item.id] : undefined, item.tableName))).map((x) => { x.tableName = item.tableName; return x; }));
    }
    async tryToClose(name) {
        try {
            if (name === undefined || name == "")
                throw "Cant close the database, name cant be undefined";
            if (typeof require === 'undefined') {
                console.log("require is undefined");
                return false;
            }
            const { NativeModulesProxy } = require("expo-modules-core");
            if (NativeModulesProxy == undefined) {
                console.log("Could not find NativeModulesProxy in expo-modules-core");
                return false;
            }
            const { ExponentSQLite } = NativeModulesProxy;
            if (ExponentSQLite == undefined || ExponentSQLite.close == undefined) {
                console.log("Could not find (ExponentSQLite or ExponentSQLite.close) in NativeModulesProxy in expo-modules-core");
                return false;
            }
            await ExponentSQLite.close(name);
            this.isClosed = true;
            this.db = undefined;
            return true;
        }
        catch (e) {
            if (console.error)
                console.error(e);
            return false;
        }
    }
    watch(tableName) {
        var watcher = new Watcher(tableName);
        watchers.push(watcher);
        return watcher;
    }
    async asQueryable(item, tableName) {
        (0, SqlQueryBuilder_1.validateTableName)(item, tableName);
        var db = this;
        return await (0, SqlQueryBuilder_1.createQueryResultType)(item, db);
    }
    query(tableName) {
        var db = this;
        return (new SqlQueryBuilder_1.Query(tableName, db));
    }
    async save(items, insertOnly, tableName) {
        var _a;
        var tItems = Array.isArray(items) ? items : [items];
        var returnItem = [];
        for (var item of tItems) {
            returnItem.push((_a = await this.localSave(item)) !== null && _a !== void 0 ? _a : item);
        }
        return returnItem;
    }
    async delete(items, tableName) {
        var tItems = Array.isArray(items) ? items : [items];
        for (var item of tItems) {
            await this.localDelete(item);
            await this.triggerWatch(tItems, "onDelete", undefined, tableName);
        }
    }
    async where(tableName, query) {
        var q = `SELECT * FROM ${tableName} ${query ? 'WHERE ' : ''}`;
        var values = [];
        if (query && Object.keys(query).length > 0) {
            var keys = Object.keys(query);
            keys.forEach((x, i) => {
                var start = x.startsWith('$') ? x.substring(0, x.indexOf('-')).replace('-', '') : undefined;
                if (!start) {
                    q += x + '=? ' + (i < keys.length - 1 ? 'AND ' : '');
                    values.push(query[x]);
                }
                else {
                    if (start == '$in') {
                        var v = query[x];
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
        return (await this.find(q, values, tableName));
    }
    async find(query, args, tableName) {
        return new Promise(async (resolve, reject) => {
            (await this.dataBase()).readTransaction(async (x) => {
                console.log('Executing Find..');
                x.executeSql(query, args, async (trans, data) => {
                    var _a;
                    var booleanColumns = (_a = this.tables.find(x => x.tableName == tableName)) === null || _a === void 0 ? void 0 : _a.columns.filter(x => x.columnType == TableStructor_1.ColumnType.Boolean);
                    console.log('query executed:' + query);
                    const translateKeys = (item) => {
                        if (!item || !booleanColumns || booleanColumns.length <= 0)
                            return item;
                        booleanColumns.forEach(column => {
                            var columnName = column.columnName;
                            if (item[columnName] != undefined && item[columnName] != null) {
                                if (item[columnName] === 0 || item[columnName] === "0" || item[columnName] === false)
                                    item[columnName] = false;
                                else
                                    item[columnName] = true;
                            }
                        });
                        return item;
                    };
                    var items = [];
                    for (var i = 0; i < data.rows.length; i++) {
                        var item = data.rows.item(i);
                        if (tableName)
                            item.tableName = tableName;
                        items.push(translateKeys(item));
                    }
                    resolve(items);
                }, (_ts, error) => {
                    console.log('Could not execute query:' + query);
                    console.log(error);
                    reject(error);
                    return false;
                });
            }, (error) => {
                console.log('Could not execute query:' + query);
                console.log(error);
                reject(error);
            });
        });
    }
    async tableHasChanges(item) {
        var appSettingsKeys = await this.allowedKeys(item.tableName);
        return appSettingsKeys.filter(x => x != "id").length != item.columns.filter(x => x.columnName != "id").length || item.columns.filter(x => x.columnName != "id" && !appSettingsKeys.find(a => a == x.columnName)).length > 0;
    }
}
Database.dbIni = false;
//# sourceMappingURL=Database.js.map