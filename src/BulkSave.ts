import { IBaseModule, IDatabase } from "./expo.sql.wrapper.types";
import { isDate } from "./SqlQueryBuilder";
import * as SQLite from 'expo-sqlite';

export default class BulkSave<T, D extends string> {
    private quries: SQLite.Query[];
    private dbContext: IDatabase<D>;
    private keys: string[];
    private tableName: D;
    constructor(dbContext: IDatabase<D>, keys: string[], tableName: D) {
        this.dbContext = dbContext;
        this.keys = keys;
        this.tableName = tableName;
        this.quries = [];
    }

    insert(items: IBaseModule<D> | IBaseModule<D>[]) {
        const itemArray = Array.isArray(items) ? items : [items];
        itemArray.forEach(item => {
            const q = { sql: `INSERT INTO ${this.tableName} (`, args: [] };
            this.keys.forEach((k, i) => {
                q.sql += k + (i < this.keys.length - 1 ? ',' : '');
            });
            q.sql += ') values(';
            this.keys.forEach((k, i) => {
                q.sql += '?' + (i < this.keys.length - 1 ? ',' : '');
            });
            q.sql += ')';

            this.keys.forEach((k: string, i) => {
                let v = (item as any)[k] ?? null;
                if (isDate(v))
                    v = v.toISOString();
                if (typeof v === "boolean")
                    v = v === true ? 1 : 0;
                q.args.push(v);
            });

            this.quries.push(q);
        });
        return this;
    }

    update(items: IBaseModule<D> | IBaseModule<D>[]) {
        const itemArray = Array.isArray(items) ? items : [items];
        itemArray.forEach(item => {
            const q = { sql: `UPDATE ${this.tableName} SET `, args: [] };
            this.keys.forEach((k, i) => {
                q.sql += ` ${k}=? ` + (i < this.keys.length - 1 ? ',' : '');
            });
            q.sql += ' WHERE id=?';
            this.keys.forEach((k: string, i) => {
                let v = (item as any)[k] ?? null;
                if (isDate(v))
                    v = v.toISOString();
                if (typeof v === "boolean")
                    v = v === true ? 1 : 0;
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
        if (this.quries.length > 0)
            await this.dbContext.executeRawSql(this.quries, false);
    }

}