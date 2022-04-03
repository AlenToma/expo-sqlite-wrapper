import { IBaseModule, SingleValue, ArrayValue, NumberValue, IChildQueryLoader, IChildLoader, IQuaryResult, IQuery, IQueryResultItem, IDatabase, Param, StringValue } from './expo.sql.wrapper.types'
export const createQueryResultType = async function <T, D extends string>(item: any, database: IDatabase<D>, children?: IChildLoader<D>[]): Promise<IQueryResultItem<T, D>> {
    var result = (item as any) as IQueryResultItem<T, D>;
    result.savechanges = async () => { return createQueryResultType<T, D>((await database.save<T>(result as any, false, undefined, true))[0], database) };
    result.delete = async () => await database.delete(result as any);
    if (children && children.length > 0) {
        for (var x of children) {
            if (x.childTableName.length > 0 && x.childProperty.length > 0 && x.parentProperty.length > 0 && x.parentTable.length > 0 && x.assignTo.length > 0) {
                if (item[x.parentProperty] === undefined) {
                    if (x.isArray)
                        item[x.assignTo] = [];
                    continue;
                }
                var filter = {} as any
                filter[x.childProperty] = item[x.parentProperty];
                var items = await database.where(x.childTableName as D, filter);
                if (x.isArray) {
                    var r = [];
                    for (var m of items)
                        r.push(await createQueryResultType(m, database))
                    item[x.assignTo] = r;
                }
                else {
                    if (items.length > 0) {
                        item[x.assignTo] = await createQueryResultType<T, D>(items[0], database);
                    }
                }
            }
        }
    }
    return result;
}
export const validateTableName = function <T, D extends string>(item: IBaseModule<D>, tableName?: D) {
    if (!item.tableName || item.tableName.length <= 2)
        if (!tableName)
            throw "TableName cannot be null, This item could not be saved"
        else item.tableName = tableName;

    return item;
}

export const single = function <T>(items: any[]) {
    if (!items || items.length === undefined || items.length <= 0)
        return undefined;
    return items[0] as T;
}



class ChildQueryLoader<T, B, D extends string> implements IChildQueryLoader<T, B, D> {
    private parent: Query<B, D>;
    private tableName: D;
    constructor(parent: Query<B, D>, tableName: D) {
        this.parent = parent;
        this.tableName = tableName;
    }

    With<E>(item: ((x: E) => any) | string) {
        var child = this.parent.Children[this.parent.Children.length - 1];
        child.childProperty = getColumns("function " + item.toString()) ?? "";
        child.childTableName = this.tableName;
        return this;
    }

    AssignTo<S, E>(item: ((x: B) => E) | string) {
        var child = this.parent.Children[this.parent.Children.length - 1];
        child.assignTo = getColumns("function " + item.toString()) ?? "";
        return this.parent as IQuery<B, D>;
    }
}

const isFunc = (value: any) => {
    return value.toString().indexOf('function') !== -1;
};

export const getColumns = (fn: any) => {
    if (!isFunc(fn))
        return fn;
    var str = fn.toString()
    if (str.indexOf('.') !== -1) {
        str = str.substring(str.indexOf('.') + 1)
    }
    if (str.indexOf('[') !== -1) {
        str = str.substring(str.indexOf('[') + 1);
    }
    str = str.replace(/\]|'|"|\+|return|;|\.|\}|\{|\(|\)|function| /gim, '').replace(/\r?\n|\r/g, "");
    return str;
}

export class Query<T, D extends string> implements IQuery<T, D>{
    Queries: any[] = [];
    tableName: D;
    Children: IChildLoader<D>[] = [];
    database: IDatabase<D>;

    private currentIndex: number = 0;
    constructor(tableName: D, database: IDatabase<D>) {
        this.database = database;
        this.tableName = tableName;
    }

    //#region private methods

    private hasNext(queries: any[]) {
        return queries.length > 0 && this.currentIndex < queries.length;
    }

    private prevValue(queries: any[]) {
        if (this.currentIndex > 1) return queries[this.currentIndex - 2];
        return undefined;
    }

    private nextValue(queries: any[]) {
        return queries.length > 0 ? queries[this.currentIndex] : undefined;
    }

    private getLast(queries: any[]) {
        if (queries.length > 0) return queries[queries.length - 1];
        return undefined;
    }

    private cleanLast() {
        var value = undefined as any;
        while ((value = this.getLast(this.Queries)) != undefined) {
            if (
                value != Param.AND &&
                value != Param.StartParameter &&
                value != Param.EndParameter &&
                value != Param.OR
            )
                this.Queries.pop();
            else break;
        }
    }

    private getValue(queries: any[]) {
        var item = queries[this.currentIndex];
        if (this.hasNext(queries)) this.currentIndex++;
        return item;
    }

    private validateValue<B>(
        value: ((x: T) => B) | SingleValue | ArrayValue,
        argstoAdd: any
    ) {
        if (
            value === undefined ||
            value === null ||
            (Array.isArray(value) &&
                (value as []).filter((x) => x !== undefined && x !== null).length <= 0)
        ) {
            if (this.Queries.length > 0) this.cleanLast();
            return;
        }

        this.Queries.push(argstoAdd);
        this.Queries.push({ queryValue: value });
    }


    private validate() {
        var totalLoob = this.Queries.length;
        for (var i = 0; i < totalLoob; i++) {
            var foundError = false;
            if (this.Queries.length <= 0) break;
            this.currentIndex = 0;
            let breakit;

            while (this.hasNext(this.Queries)) {
                var pValue = this.prevValue(this.Queries);
                var value = this.getValue(this.Queries);
                var next = this.nextValue(this.Queries);
                switch (value) {
                    case Param.EqualTo:
                    case Param.OR:
                    case Param.AND:
                    case Param.LessThan:
                    case Param.GreaterThan:
                    case Param.IN:
                    case Param.NotIn:
                    case Param.NotEqualTo:
                    case Param.Contains:
                    case Param.StartWith:
                    case Param.EndWith:
                    case Param.EqualAndGreaterThen:
                    case Param.EqualAndLessThen:
                        if (next === undefined) {
                            this.Queries.pop();
                            breakit = true;
                        }
                        break;
                    case Param.StartParameter:
                        if (next == Param.AND || next == Param.OR) {
                            this.Queries.splice(this.currentIndex, 1);
                            breakit = true;
                        }
                        if (next === undefined) {
                            this.Queries.pop();
                            breakit = true;
                        }
                        break;
                    case Param.EndParameter:
                        if (
                            pValue == Param.AND ||
                            pValue == Param.OR ||
                            pValue == Param.StartParameter ||
                            pValue == undefined
                        ) {
                            this.Queries.splice(this.currentIndex - 1, 1);
                            breakit = true;
                        }
                        break;
                    case Param.NULL:
                    case Param.NotNULL:
                        break;
                    default: {

                    }
                }
                if (breakit) {
                    foundError = true;
                    break;
                }
            }

            if (!foundError) break;
        }
        this.currentIndex = 0;
    }

    //#endregion

    //#region public Methods
    Column<B>(item: ((x: T) => B) | string) {
        this.Queries.push("function " + item.toString());
        return this;
    }

    EqualTo(value: SingleValue) {
        if (this.Queries.length > 0) this.validateValue(value, Param.EqualTo);
        return this
    }

    NotEqualTo(value: SingleValue) {
        if (this.Queries.length > 0) this.validateValue(value, Param.NotEqualTo);
        return this;
    }

    EqualAndGreaterThen(value: NumberValue | StringValue) {
        if (this.Queries.length > 0)
            this.validateValue(value, Param.EqualAndGreaterThen);
        return this;
    }

    EqualAndLessThen(value: NumberValue | StringValue) {
        if (this.Queries.length > 0)
            this.validateValue(value, Param.EqualAndLessThen);
        return this;
    }

    Start() {
        this.Queries.push(Param.StartParameter);
        return this;
    }

    End() {
        if (this.Queries.length > 0) this.Queries.push(Param.EndParameter);
        return this;
    }

    OR() {
        if (this.Queries.length > 0) this.Queries.push(Param.OR);
        return this;
    }

    AND() {
        if (this.Queries.length > 0) this.Queries.push(Param.AND);
        return this;
    }

    GreaterThan(value: NumberValue | StringValue) {
        if (this.Queries.length > 0) this.validateValue(value, Param.GreaterThan);
        return this;
    }


    LessThan(value: NumberValue | StringValue) {
        if (this.Queries.length > 0) this.validateValue(value, Param.LessThan);
        return this;
    }

    IN(value: ArrayValue) {
        if (this.Queries.length > 0) this.validateValue(value, Param.IN);
        return this;
    }

    NotIn(value: ArrayValue) {
        if (this.Queries.length > 0) this.validateValue(value, Param.NotIn);
        return this;
    }

    Null() {
        if (this.Queries.length > 0) this.Queries.push(Param.NULL);
        return this;
    }

    NotNull() {
        if (this.Queries.length > 0) this.Queries.push(Param.NotNULL);
        return this;
    }

    Contains(value: StringValue) {
        if (this.Queries.length > 0) this.validateValue(value, Param.Contains);
        return this;
    }

    StartWith(value: StringValue) {
        if (this.Queries.length > 0) this.validateValue(value, Param.StartWith);
        return this;
    }

    EndWith(value: StringValue) {
        if (this.Queries.length > 0) this.validateValue(value, Param.EndWith);
        return this;
    }

    OrderByAsc<B>(item: string | ((x: T) => B)) {
        this.Queries.push(Param.OrderByAsc)
        this.Queries.push("function " + item.toString());
        return this;
    }

    OrderByDesc<B>(item: string | ((x: T) => B)) {
        this.Queries.push(Param.OrderByDesc)
        this.Queries.push("function " + item.toString());
        return this;
    }

    Limit(value: number) {
        this.validateValue(value, Param.Limit);
        return this;
    }

    LoadChildren<B>(childTableName: D, parentProperty: ((x: T) => B) | string) {
        var item = {
            parentProperty: getColumns("function " + parentProperty.toString()),
            parentTable: this.tableName,
            childTableName: childTableName,
            childProperty: '',
            isArray: true,
            assignTo: "",
        } as IChildLoader<D>;
        this.Children.push(item);
        return (new ChildQueryLoader<B, T, D>(this, childTableName) as any) as IChildQueryLoader<B, T, D>;
    }


    LoadChild<B>(childTableName: D, parentProperty: ((x: T) => B) | string) {
        var item = {
            parentProperty: getColumns("function " + parentProperty.toString()),
            parentTable: this.tableName,
            childTableName: childTableName,
            childProperty: '',
            isArray: false,
            assignTo: "",
        } as IChildLoader<D>;
        this.Children.push(item);
        return (new ChildQueryLoader<B, T, D>(this, childTableName) as any) as IChildQueryLoader<B, T, D>;
    }


    getQueryResult(operation?: "SELECT" | "DELETE") {
        if (!operation)
            operation = "SELECT";

        this.validate();
        var queries = [] as any[];
        if (operation === "DELETE") {
            for (var i = 0; i < this.Queries.length; i++) {
                const x = this.Queries[i];
                if ((x == Param.Limit || x == Param.OrderByAsc || x == Param.OrderByDesc)) {
                    i++;
                    continue;
                }

                queries.push(x);
            }
        } else queries = [...this.Queries]
        var addWhere = false;
        for (var i = 0; i < queries.length; i++) {
            const x = queries[i];
            if (x == Param.Limit || x == Param.OrderByAsc || x == Param.OrderByDesc) {
                i++;
                continue;
            } else {
                addWhere = true;
                break;
            }

        }
        var result = {
            sql: `${operation} ${operation == "SELECT" ? "* " : ""}FROM ${this.tableName} ${addWhere ? ' WHERE ' : ''}`,
            values: [],
            children: this.Children,
        } as IQuaryResult<D>;

        const appendSql = (s: string) => {
            result.sql += s + ' ';
        };

        const translate = (value: any) => {
            var pValue = this.prevValue(queries);
            switch (value) {
                case Param.StartParameter:
                case Param.EqualTo:
                case Param.EndParameter:
                case Param.OR:
                case Param.AND:
                case Param.LessThan:
                case Param.GreaterThan:
                case Param.IN:
                case Param.NotIn:
                case Param.NotEqualTo:
                case Param.NotNULL:
                case Param.NULL:
                case Param.EqualAndGreaterThen:
                case Param.EqualAndLessThen:
                    value = value.toString().substring(1);
                    appendSql(value);
                    break;

                case Param.OrderByAsc:
                case Param.OrderByDesc:
                    appendSql(value.toString().substring(1).replace("#C", getColumns(this.getValue(queries))));
                    break;
                case Param.Limit:
                    appendSql(value.toString().substring(1).replace("#Counter", this.getValue(queries).queryValue));
                    break;
                case Param.Contains:
                case Param.StartWith:
                case Param.EndWith:
                    appendSql("like");
                    break;
                default: {
                    if (isFunc(value)) appendSql(getColumns(value) ?? '');
                    else if (value.queryValue !== undefined &&
                        (pValue === Param.IN || pValue == Param.NotIn)
                    ) {
                        var v = Array.isArray(value.queryValue)
                            ? (value.queryValue as any[])
                            : [value.queryValue];
                        appendSql(`( ${v.map((x) => '?').join(',')} )`);
                        v.forEach((x) => {
                            if (x !== undefined) result.values.push(x);
                        });
                    } else if (value.queryValue !== undefined) {
                        if (pValue == Param.Contains || pValue == Param.StartWith || pValue == Param.EndWith) {
                            if (pValue == Param.Contains)
                                value = { queryValue: `%${value.queryValue}%` }
                            else if (pValue == Param.StartWith)
                                value = { queryValue: `${value.queryValue}%` }
                            else value = { queryValue: `%${value.queryValue}` }
                        }

                        appendSql('?');
                        if (Array.isArray(value.queryValue))
                            value.queryValue = (value.queryValue as []).join(',');
                        result.values.push(value.queryValue);
                    }
                }
            }
        };
        while (this.hasNext(queries)) {
            translate(this.getValue(queries));
        }
        this.currentIndex = 0;
        return result;
    }

    async delete() {
        var item = this.getQueryResult("DELETE");
        console.log("Execute delete:" + item.sql)
        await this.database.execute(item.sql, item.values);
    }

    async firstOrDefault() {
        var item = this.getQueryResult();
        console.log("Execute firstOrDefault:" + item.sql)
        var tItem = single(await this.database.find(item.sql, item.values, this.tableName));
        return tItem ? await createQueryResultType<T, D>(tItem, this.database, this.Children) : undefined;
    }

    async findOrSave(item: T & IBaseModule<D>) {
        var sqls = this.getQueryResult();
        (item as any).tableName = this.tableName;
        var dbItem = single(await this.database.find(sqls.sql, sqls.values, this.tableName));
        if (!dbItem) {
            dbItem = (await this.database.save<T>(item, false, this.tableName))[0];

        }
        (dbItem as any).tableName = this.tableName;
        return await createQueryResultType<T, D>(dbItem, this.database, this.Children);
    }

    async toList() {
        var item = this.getQueryResult();
        var result = [] as IQueryResultItem<T, D>[];
        for (var x of await this.database.find(item.sql, item.values, this.tableName)) {
            x.tableName = this.tableName;
            result.push(await createQueryResultType<T, D>(x, this.database, this.Children));
        }
        return result;
    }

    //#endregion
}