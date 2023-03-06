import { IBaseModule, IDatabase, IDataBaseExtender } from "./expo.sql.wrapper.types";
import { encrypt, isDate, oEncypt, getAvailableKeys } from "./SqlQueryBuilder";
import * as SQLite from 'expo-sqlite';

export default class BulkSave<T, D extends string> {
    quries: SQLite.Query[];
    private dbContext: IDataBaseExtender<D>;
    private keys: string[];
    private tableName: D;
    constructor(dbContext: IDatabase<D>, keys: string[], tableName: D) {
        this.dbContext = dbContext as any;
        this.keys = keys;
        this.tableName = tableName;
        this.quries = [];
    }

    insert(items: IBaseModule<D> | IBaseModule<D>[]) {
        const itemArray = Array.isArray(items) ? items : [items];
        const table = this.dbContext.tables.find(x => x.tableName == this.tableName);
        itemArray.forEach(item => {
            const q = { sql: `INSERT INTO ${this.tableName} (`, args: [] };
            const keys = getAvailableKeys(this.keys, item);
            keys.forEach((k, i) => {
                q.sql += k + (i < keys.length - 1 ? ',' : '');
            });
            q.sql += ') values(';
            keys.forEach((k, i) => {
                q.sql += '?' + (i < keys.length - 1 ? ',' : '');
            });
            q.sql += ')';

            keys.forEach((k: string, i) => {
                const column = table?.props.find(x => x.columnName == k && x.encryptionKey);
                let v = (item as any)[k] ?? null;
                if (isDate(v))
                    v = v.toISOString();
                if (typeof v === "boolean")
                    v = v === true ? 1 : 0;
                if (column)
                    v = encrypt(v, column.encryptionKey);
                q.args.push(v);
            });

            this.quries.push(q);
        });
        return this;
    }

    update(items: IBaseModule<D> | IBaseModule<D>[]) {
        const itemArray = Array.isArray(items) ? items : [items];
        const table = this.dbContext.tables.find(x => x.tableName == this.tableName);
        itemArray.forEach(item => {
            const q = { sql: `UPDATE ${this.tableName} SET `, args: [] };
            const keys = getAvailableKeys(this.keys, item);
            keys.forEach((k, i) => {
                q.sql += ` ${k}=? ` + (i < keys.length - 1 ? ',' : '');
            });
            q.sql += ' WHERE id=?';
            keys.forEach((k: string, i) => {
                const column = table?.props.find(x => x.columnName == k && x.encryptionKey);
                let v = (item as any)[k] ?? null;
                if (isDate(v))
                    v = v.toISOString();
                if (typeof v === "boolean")
                    v = v === true ? 1 : 0;
                if (column)
                    v = encrypt(v, column.encryptionKey);
                q.args.push(v);
            });
            q.args.push(item.id);
            this.quries.push(q);
        });
        return this;
    }

    delete(items: IBaseModule<D> | IBaseModule<D>[]) {
        const itemArray = Array.isArray(items) ? items : [items];
        itemArray.forEach(item => {
            const q = { sql: `DELETE FROM ${this.tableName} WHERE id = ?`, args: [item.id] };
            this.quries.push(q);
        });
        return this;
    }


    async execute() {
        if (this.quries.length > 0) {
            await this.dbContext.executeRawSql(this.quries, false);
            const db = this.dbContext as IDataBaseExtender<D>;
            await db.triggerWatch([], "onBulkSave", undefined, this.tableName);
        }
    }

}