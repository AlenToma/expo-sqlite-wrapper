import Functions from "./Functions";
import {IDataBaseExtender} from '../expo.sql.wrapper.types'
import QuerySelector,{Param} from '../QuerySelector'
export default class QValue {
    value?: any;
    args?: Param;
    isColumn?: boolean;
    alias?: string;
    isFunction: boolean;
    selector?: QuerySelector<any, any>;
    type = "QValue";

    validate() {
        this.isFunction = Functions.isFunc(this.value);
    }

    toSqlValue(database: IDataBaseExtender<string>, tableName: string, column?: string) {
        return Functions.translateAndEncrypt(this.value, database, tableName, column);
    }

    async getInnserSelectorValue() {
        if (!this.selector)
            throw "Database cannot be null";

        const items = await this.value.toList();
        const res = [];
        items.forEach(x => {
            for (const k in x) {
                const v = x[k];
                if (k === "tableName" || !Functions.isPrimitive(v))
                    continue;
                res.push(v);
            }
        })

        this.value = res;

    }

    map(fn: (x: QValue) => any) {
        return this.toArray().map(x => {
            const item = QValue.Q;
            item.isColumn = this.isColumn;
            item.args = this.args;
            item.isFunction = this.isFunction;
            item.value = x;
            return fn(item);
        }) as QValue[];
    }

    toArray() {
        return Array.isArray(this.value) ? this.value : [this.value];
    }

    toType<T>() {
        return this.value as T;
    }

    getColumn(jsonExpression: any) {
        try {
            if (typeof this.value === "string")
                return this.value as string;
            else {
                return this.toType<Function>()(jsonExpression, Functions.aliasNameming).toString().split(",").filter(x => x.length > 1).join(",") as string;
            }
        } catch (e) {
            console.error(e, this)
            throw e
        }
    }

    getColumns(jsonExpression: any) {
        if (typeof this.value === "string")
            return [this.value as string];
        else {
            return this.toType<Function>()(jsonExpression, Functions.aliasNameming).toString().split(",").filter(x => x.length > 1);
        }
    }

    static get Q() {
        return new QValue();
    }

    Value(value?: any) {
        this.value = value;
        this.validate();
        return this;
    }
    Args(args: Param) {
        this.args = args;
        return this;
    }

    IsColumn(isColumn: boolean) {
        this.isColumn = isColumn;
        return this;
    }

    Alias(alias: string) {
        this.alias = alias;
        return this;
    }
}