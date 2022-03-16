"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Query = exports.getColumns = exports.single = exports.validateTableName = exports.createQueryResultType = void 0;
const expo_sql_wrapper_types_1 = require("./expo.sql.wrapper.types");
const createQueryResultType = async function (item, database, children) {
    var result = item;
    result.savechanges = async () => { return (0, exports.createQueryResultType)((await database.save(result))[0], database); };
    result.delete = async () => await database.delete(result);
    if (children && children.length > 0) {
        for (var x of children) {
            if (x.childTableName.length > 0 && x.childProperty.length > 0 && x.parentProperty.length > 0 && x.parentTable.length > 0 && x.assignTo.length > 0) {
                if (item[x.parentProperty] === undefined) {
                    if (x.isArray)
                        item[x.assignTo] = [];
                    continue;
                }
                var filter = {};
                filter[x.childProperty] = item[x.parentProperty];
                var items = await database.where(x.childTableName, filter);
                if (x.isArray) {
                    var r = [];
                    for (var m of items)
                        r.push(await (0, exports.createQueryResultType)(m, database));
                    item[x.assignTo] = r;
                }
                else {
                    if (items.length > 0) {
                        item[x.assignTo] = await (0, exports.createQueryResultType)(items[0], database);
                    }
                }
            }
        }
    }
    return result;
};
exports.createQueryResultType = createQueryResultType;
const validateTableName = function (item, tableName) {
    if (!item.tableName || item.tableName.length <= 2)
        if (!tableName)
            throw "TableName cannot be null, This item could not be saved";
        else
            item.tableName = tableName;
    return item;
};
exports.validateTableName = validateTableName;
const single = function (items) {
    if (!items || items.length === undefined || items.length <= 0)
        return undefined;
    return items[0];
};
exports.single = single;
class ChildQueryLoader {
    constructor(parent, tableName) {
        this.parent = parent;
        this.tableName = tableName;
    }
    With(item) {
        var _a;
        var child = this.parent.Children[this.parent.Children.length - 1];
        child.childProperty = (_a = (0, exports.getColumns)("function " + item.toString())) !== null && _a !== void 0 ? _a : "";
        child.childTableName = this.tableName;
        return this;
    }
    AssignTo(item) {
        var _a;
        var child = this.parent.Children[this.parent.Children.length - 1];
        child.assignTo = (_a = (0, exports.getColumns)("function " + item.toString())) !== null && _a !== void 0 ? _a : "";
        return this.parent;
    }
}
const isFunc = (value) => {
    return value.toString().indexOf('function') !== -1;
};
const getColumns = (fn) => {
    if (!isFunc(fn))
        return fn;
    var str = fn.toString();
    if (str.indexOf('.') !== -1) {
        str = str.substring(str.indexOf('.') + 1);
    }
    if (str.indexOf('[') !== -1) {
        str = str.substring(str.indexOf('[') + 1);
    }
    str = str.replace(/\]|'|"|\+|return|;|\.|\}|\{|\(|\)|function| /gim, '').replace(/\r?\n|\r/g, "");
    return str;
};
exports.getColumns = getColumns;
class Query {
    constructor(tableName, database) {
        this.Queries = [];
        this.Children = [];
        this.currentIndex = 0;
        this.database = database;
        this.tableName = tableName;
    }
    hasNext() {
        return this.Queries.length > 0 && this.currentIndex < this.Queries.length;
    }
    prevValue() {
        if (this.currentIndex > 1)
            return this.Queries[this.currentIndex - 2];
        return undefined;
    }
    nextValue() {
        return this.Queries.length > 0 ? this.Queries[this.currentIndex] : undefined;
    }
    getLast() {
        if (this.Queries.length > 0)
            return this.Queries[this.Queries.length - 1];
        return undefined;
    }
    cleanLast() {
        var value = undefined;
        while ((value = this.getLast()) != undefined) {
            if (value != expo_sql_wrapper_types_1.Param.AND &&
                value != expo_sql_wrapper_types_1.Param.StartParameter &&
                value != expo_sql_wrapper_types_1.Param.EndParameter &&
                value != expo_sql_wrapper_types_1.Param.OR)
                this.Queries.pop();
            else
                break;
        }
    }
    getValue() {
        var item = this.Queries[this.currentIndex];
        if (this.hasNext())
            this.currentIndex++;
        return item;
    }
    validateValue(value, argstoAdd) {
        if (value === undefined ||
            value === null ||
            (Array.isArray(value) &&
                value.filter((x) => x !== undefined && x !== null).length <= 0)) {
            if (this.Queries.length > 0)
                this.cleanLast();
            return;
        }
        this.Queries.push(argstoAdd);
        this.Queries.push({ queryValue: value });
    }
    validate() {
        var totalLoob = this.Queries.length;
        for (var i = 0; i < totalLoob; i++) {
            var foundError = false;
            if (this.Queries.length <= 0)
                break;
            this.currentIndex = 0;
            let breakit;
            while (this.hasNext()) {
                var pValue = this.prevValue();
                var value = this.getValue();
                var next = this.nextValue();
                switch (value) {
                    case expo_sql_wrapper_types_1.Param.EqualTo:
                    case expo_sql_wrapper_types_1.Param.OR:
                    case expo_sql_wrapper_types_1.Param.AND:
                    case expo_sql_wrapper_types_1.Param.LessThan:
                    case expo_sql_wrapper_types_1.Param.GreaterThan:
                    case expo_sql_wrapper_types_1.Param.IN:
                    case expo_sql_wrapper_types_1.Param.NotIn:
                    case expo_sql_wrapper_types_1.Param.NotEqualTo:
                    case expo_sql_wrapper_types_1.Param.Contains:
                    case expo_sql_wrapper_types_1.Param.StartWith:
                    case expo_sql_wrapper_types_1.Param.EndWith:
                    case expo_sql_wrapper_types_1.Param.EqualAndGreaterThen:
                    case expo_sql_wrapper_types_1.Param.EqualAndLessThen:
                        if (next === undefined) {
                            this.Queries.pop();
                            breakit = true;
                        }
                        break;
                    case expo_sql_wrapper_types_1.Param.StartParameter:
                        if (next == expo_sql_wrapper_types_1.Param.AND || next == expo_sql_wrapper_types_1.Param.OR) {
                            this.Queries.splice(this.currentIndex, 1);
                            breakit = true;
                        }
                        if (next === undefined) {
                            this.Queries.pop();
                            breakit = true;
                        }
                        break;
                    case expo_sql_wrapper_types_1.Param.EndParameter:
                        if (pValue == expo_sql_wrapper_types_1.Param.AND ||
                            pValue == expo_sql_wrapper_types_1.Param.OR ||
                            pValue == expo_sql_wrapper_types_1.Param.StartParameter ||
                            pValue == undefined) {
                            this.Queries.splice(this.currentIndex - 1, 1);
                            breakit = true;
                        }
                        break;
                    case expo_sql_wrapper_types_1.Param.NULL:
                    case expo_sql_wrapper_types_1.Param.NotNULL:
                        break;
                    default: {
                    }
                }
                if (breakit) {
                    foundError = true;
                    break;
                }
            }
            if (!foundError)
                break;
        }
        this.currentIndex = 0;
    }
    Column(item) {
        this.Queries.push("function " + item.toString());
        return this;
    }
    EqualTo(value) {
        if (this.Queries.length > 0)
            this.validateValue(value, expo_sql_wrapper_types_1.Param.EqualTo);
        return this;
    }
    NotEqualTo(value) {
        if (this.Queries.length > 0)
            this.validateValue(value, expo_sql_wrapper_types_1.Param.NotEqualTo);
        return this;
    }
    EqualAndGreaterThen(value) {
        if (this.Queries.length > 0)
            this.validateValue(value, expo_sql_wrapper_types_1.Param.EqualAndGreaterThen);
        return this;
    }
    EqualAndLessThen(value) {
        if (this.Queries.length > 0)
            this.validateValue(value, expo_sql_wrapper_types_1.Param.EqualAndLessThen);
        return this;
    }
    Start() {
        this.Queries.push(expo_sql_wrapper_types_1.Param.StartParameter);
        return this;
    }
    End() {
        if (this.Queries.length > 0)
            this.Queries.push(expo_sql_wrapper_types_1.Param.EndParameter);
        return this;
    }
    OR() {
        if (this.Queries.length > 0)
            this.Queries.push(expo_sql_wrapper_types_1.Param.OR);
        return this;
    }
    AND() {
        if (this.Queries.length > 0)
            this.Queries.push(expo_sql_wrapper_types_1.Param.AND);
        return this;
    }
    GreaterThan(value) {
        if (this.Queries.length > 0)
            this.validateValue(value, expo_sql_wrapper_types_1.Param.GreaterThan);
        return this;
    }
    LessThan(value) {
        if (this.Queries.length > 0)
            this.validateValue(value, expo_sql_wrapper_types_1.Param.LessThan);
        return this;
    }
    IN(value) {
        if (this.Queries.length > 0)
            this.validateValue(value, expo_sql_wrapper_types_1.Param.IN);
        return this;
    }
    NotIn(value) {
        if (this.Queries.length > 0)
            this.validateValue(value, expo_sql_wrapper_types_1.Param.NotIn);
        return this;
    }
    Null() {
        if (this.Queries.length > 0)
            this.Queries.push(expo_sql_wrapper_types_1.Param.NULL);
        return this;
    }
    NotNull() {
        if (this.Queries.length > 0)
            this.Queries.push(expo_sql_wrapper_types_1.Param.NotNULL);
        return this;
    }
    Contains(value) {
        if (this.Queries.length > 0)
            this.validateValue(value, expo_sql_wrapper_types_1.Param.Contains);
        return this;
    }
    StartWith(value) {
        if (this.Queries.length > 0)
            this.validateValue(value, expo_sql_wrapper_types_1.Param.StartWith);
        return this;
    }
    EndWith(value) {
        if (this.Queries.length > 0)
            this.validateValue(value, expo_sql_wrapper_types_1.Param.EndWith);
        return this;
    }
    LoadChildren(childTableName, parentProperty) {
        var item = {
            parentProperty: (0, exports.getColumns)("function " + parentProperty.toString()),
            parentTable: this.tableName,
            childTableName: childTableName,
            childProperty: '',
            isArray: true,
            assignTo: "",
        };
        this.Children.push(item);
        return new ChildQueryLoader(this, childTableName);
    }
    LoadChild(childTableName, parentProperty) {
        var item = {
            parentProperty: (0, exports.getColumns)("function " + parentProperty.toString()),
            parentTable: this.tableName,
            childTableName: childTableName,
            childProperty: '',
            isArray: false,
            assignTo: "",
        };
        this.Children.push(item);
        return new ChildQueryLoader(this, childTableName);
    }
    getQueryResult() {
        this.validate();
        var result = {
            sql: `SELECT * FROM ${this.tableName} ${this.Queries.length > 0 ? ' WHERE ' : ''}`,
            values: [],
            children: this.Children,
        };
        const appendSql = (s) => {
            result.sql += s + ' ';
        };
        const translate = (value) => {
            var _a;
            var pValue = this.prevValue();
            switch (value) {
                case expo_sql_wrapper_types_1.Param.StartParameter:
                case expo_sql_wrapper_types_1.Param.EqualTo:
                case expo_sql_wrapper_types_1.Param.EndParameter:
                case expo_sql_wrapper_types_1.Param.OR:
                case expo_sql_wrapper_types_1.Param.AND:
                case expo_sql_wrapper_types_1.Param.LessThan:
                case expo_sql_wrapper_types_1.Param.GreaterThan:
                case expo_sql_wrapper_types_1.Param.IN:
                case expo_sql_wrapper_types_1.Param.NotEqualTo:
                case expo_sql_wrapper_types_1.Param.NotNULL:
                case expo_sql_wrapper_types_1.Param.NULL:
                case expo_sql_wrapper_types_1.Param.EqualAndGreaterThen:
                case expo_sql_wrapper_types_1.Param.EqualAndLessThen:
                    value = value.toString().substring(1);
                    appendSql(value);
                    break;
                case expo_sql_wrapper_types_1.Param.Contains:
                case expo_sql_wrapper_types_1.Param.StartWith:
                case expo_sql_wrapper_types_1.Param.EndWith:
                    appendSql("like");
                    break;
                default: {
                    if (isFunc(value))
                        appendSql((_a = (0, exports.getColumns)(value)) !== null && _a !== void 0 ? _a : '');
                    else if (value.queryValue !== undefined &&
                        (pValue === expo_sql_wrapper_types_1.Param.IN || pValue == expo_sql_wrapper_types_1.Param.NotIn)) {
                        var v = Array.isArray(value.queryValue)
                            ? value.queryValue
                            : [value.queryValue];
                        appendSql(`( ${v.map((x) => '?').join(',')} )`);
                        v.forEach((x) => {
                            if (x !== undefined)
                                result.values.push(x);
                        });
                    }
                    else if (value.queryValue !== undefined) {
                        if (pValue == expo_sql_wrapper_types_1.Param.Contains || pValue == expo_sql_wrapper_types_1.Param.StartWith || pValue == expo_sql_wrapper_types_1.Param.EndWith) {
                            if (pValue == expo_sql_wrapper_types_1.Param.Contains)
                                value = { queryValue: `%${value.queryValue}%` };
                            else if (pValue == expo_sql_wrapper_types_1.Param.StartWith)
                                value = { queryValue: `${value.queryValue}%` };
                            else
                                value = { queryValue: `%${value.queryValue}` };
                        }
                        appendSql('?');
                        if (Array.isArray(value.queryValue))
                            value.queryValue = value.queryValue.join(',');
                        result.values.push(value.queryValue);
                    }
                }
            }
        };
        while (this.hasNext()) {
            translate(this.getValue());
        }
        this.currentIndex = 0;
        return result;
    }
    async firstOrDefault() {
        var item = this.getQueryResult();
        console.log("Execute firstOrDefault:" + item.sql);
        var tItem = (0, exports.single)(await this.database.find(item.sql, item.values, this.tableName));
        return tItem ? await (0, exports.createQueryResultType)(tItem, this.database, this.Children) : undefined;
    }
    async findOrSave(item) {
        var sqls = this.getQueryResult();
        item.tableName = this.tableName;
        var dbItem = (0, exports.single)(await this.database.find(sqls.sql, sqls.values, this.tableName));
        if (!dbItem) {
            dbItem = (await this.database.save(item, false, this.tableName))[0];
        }
        dbItem.tableName = this.tableName;
        return await (0, exports.createQueryResultType)(dbItem, this.database, this.Children);
    }
    async toList() {
        var item = this.getQueryResult();
        var result = [];
        for (var x of await this.database.find(item.sql, item.values, this.tableName)) {
            x.tableName = this.tableName;
            result.push(await (0, exports.createQueryResultType)(x, this.database, this.Children));
        }
        return result;
    }
}
exports.Query = Query;
//# sourceMappingURL=SqlQueryBuilder.js.map