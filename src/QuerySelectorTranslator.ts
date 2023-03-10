import QuerySelector, { Param, Where, IColumnSelector } from './QuerySelector'
import * as SqlLite from 'expo-sqlite'
import {Counter, StringBuilder, Functions} from './UsefullMethods'

export default class QuerySelectorTranslator {
    selector: QuerySelector<any, string>;
    querySelectorSql: StringBuilder;
    sql: Map<string, SqlLite.Query>;
    constructor(selector: QuerySelector<any, any>) {
        this.selector = selector;
        this.querySelectorSql = new StringBuilder();
        this.sql = new Map();
    }

    private translateDeleteColumn() {
        let sql = new StringBuilder();
        return sql.append("DELETE FROM", this.selector.tableName);
    }

    private translateColumns() {
        let sql = new StringBuilder();
        if (!this.selector.queryColumnSelector)
            return sql.append("SELECT * FROM", this.selector.tableName, this.selector.joins.length > 0 ? "as a" : "")
        const counter = new Counter(this.selector.queryColumnSelector.columns);
        let addedColumns = false;
        while (counter.hasNext) {
            const value = counter.next;
            switch (value.args) {
                case Param.Count:
                    sql.append(`COUNT(${value.getColumn(this.selector.jsonExpression)})`, "as", value.alias, ",");
                    break;
                case Param.Min:
                    sql.append(`MIN(${value.getColumn(this.selector.jsonExpression)})`, "as", value.alias, ",");
                    break;
                case Param.Max:
                    sql.append(`Max(${value.getColumn(this.selector.jsonExpression)})`, "as", value.alias, ",");
                    break;
                default:
                    addedColumns = true;
                    sql.append(value.getColumn(this.selector.jsonExpression), ",")
                    break;
            }
        }
        if (!addedColumns && !sql.isEmpty)
            sql.append("*")

        if (sql.isEmpty)
            return sql.append("SELECT * FROM", this.selector.tableName, this.selector.joins.length > 0 ? "as a" : "")
        return sql.trimEnd(",").prepend("SELECT").append("FROM", this.selector.tableName, this.selector.joins.length > 0 ? "as a" : "")

    }

    private translateOthers() {
        const counter = new Counter(this.selector.others.filter(x => x.args != Param.GroupBy));
        let sql = new StringBuilder();
        if (counter.length <= 0)
            return sql;
        const orderBy = [] as string[];
        let limit = "";
        while (counter.hasNext) {
            const value = counter.next;
            switch (value.args) {
                case Param.OrderByAsc:
                case Param.OrderByDesc:
                    const columns = value.getColumns(this.selector.jsonExpression);
                    columns.forEach(c => {
                        orderBy.push(`${c} ${value.args === Param.OrderByAsc ? "ASC" : "DESC"}`);
                    });

                    break
                case Param.Limit:
                    limit = value.args.toString().substring(1).replace("#Counter", value.value.toString());
                    break;
            }
        }

        if (orderBy.length > 0) {
            sql.append("ORDER BY", orderBy.join(", "));
        }

        if (limit.length > 0)
            sql.append(limit)

        return sql;
    }

    private translateJoins(args: any[]) {
        const counter = new Counter(this.selector.joins);
        let sql = new StringBuilder();
        if (counter.length <= 0)
            return sql;
        while (counter.hasNext) {
            const value = counter.next;
            const joinType = value.Queries[0];
            sql.append(`${joinType.args.substring(1)} ${value.tableName} as ${value.alias} ON ${this.translateWhere(value, args)}`);
        }

        return sql;
    }

    private translateWhere(item: Where<any, any, string>, args: any[]) {
        const counter = new Counter(item.Queries);
        let sql = new StringBuilder();
        while (counter.hasNext) {
            const value = counter.next;
            const pValue = counter.prev;
            let column = undefined;
            if (pValue && (pValue.isColumn || pValue.isFunction))
                column = pValue.getColumn(this.selector.jsonExpression)
            const arrValue = value.map(x => x);
            switch (value.args) {
                case Param.EqualTo:
                case Param.LessThan:
                case Param.GreaterThan:
                case Param.IN:
                case Param.NotEqualTo:
                case Param.EqualAndGreaterThen:
                case Param.EqualAndLessThen:
                    sql.append(value.args.substring(1));
                    if (!value.isFunction && !value.isColumn) {
                        {
                            if (value.args.indexOf("(") != -1)
                                sql.append(arrValue.map(x => "?").join(", "), ")");
                            else sql.append("?");
                            args.push(...arrValue.map(x => Functions.translateAndEncrypt(x.value, this.selector.database, item.tableName, column)));
                        }
                    } else {
                        if (value.args.indexOf("(") != -1)
                            sql.append(arrValue.map(x => x.getColumn(this.selector.jsonExpression)).join(", "), ")");
                        else sql.append(value.getColumn(this.selector.jsonExpression));
                    }

                    break;
                case Param.NotNULL:
                case Param.NULL:
                case Param.OR:
                case Param.AND:
                case Param.StartParameter:
                case Param.EndParameter:
                case Param.Not:
                    sql.append(value.args.substring(1));
                    break;
                case Param.Contains:
                case Param.StartWith:
                case Param.EndWith:
                    let v = value.isFunction ? value.getColumn(this.selector.jsonExpression) : Functions.translateAndEncrypt(value.value, this.selector.database, this.selector.tableName, column);
                    if (value.args === Param.Contains)
                        v = value.isFunction ? `'%' + ${v} + '%'` : `%${v}%`;
                    else if (value.args === Param.StartWith)
                        v = value.isFunction ? `${v} + '%'` : `${v}%`;
                    else v = value.isFunction ? `'%' +${v}` : `%${v}`;
                    if (!value.isFunction) {
                        sql.append("like", "?");
                        args.push(v);
                    } else {
                        sql.append("like", v);
                    }

                    break;
                default:
                    if (value.isFunction || value.isColumn)
                        sql.append(value.getColumn(this.selector.jsonExpression));
                    break
            }
        }

        return sql;
    }

    translate(selectType: "SELECT" | "DELETE") {
        try {
            const args = [] as any[];
            if (this.sql.has(selectType))
                return this.sql.get(selectType);
            const whereSql = this.selector.where ? this.translateWhere(this.selector.where, args) : new StringBuilder();
            const groupBy = this.selector.others.filter(x => x.args === Param.GroupBy).map(x => x.getColumn(this.selector.jsonExpression));
            const otherSql = this.translateOthers();
            const joinSql = selectType === "SELECT" ? this.translateJoins(args) : new StringBuilder();
            const havingSql = this.selector.having && selectType === "SELECT" ? this.translateWhere(this.selector.having, args) : new StringBuilder();
            const selectcColumnSql = selectType == "DELETE" ? this.translateDeleteColumn() : this.translateColumns();
            const sql = new StringBuilder(selectcColumnSql.toString().trim());
            if (!joinSql.isEmpty && selectType == "SELECT")
                sql.append(joinSql.toString().trim());
            if (!whereSql.isEmpty)
                sql.append("WHERE", whereSql.toString().trim());
            if (groupBy.length > 0 && selectType == "SELECT")
                sql.append("GROUP BY", groupBy.join(", "));
            if (!havingSql.isEmpty && selectType == "SELECT")
                sql.append("HAVING", havingSql.toString().trim());
            if (!otherSql.isEmpty && selectType == "SELECT")
                sql.append(otherSql.toString().trim());

            this.sql.set(selectType, { sql: sql.toString().trim(), args: args });
            return this.sql.get(selectType);
        } catch (e) {
            console.error(e);
            throw e;
        }

    }
}