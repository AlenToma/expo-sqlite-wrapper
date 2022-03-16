"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColumnType = void 0;
const SqlQueryBuilder_1 = require("./SqlQueryBuilder");
var ColumnType;
(function (ColumnType) {
    ColumnType[ColumnType["Number"] = 0] = "Number";
    ColumnType[ColumnType["String"] = 1] = "String";
    ColumnType[ColumnType["Decimal"] = 2] = "Decimal";
    ColumnType[ColumnType["Boolean"] = 3] = "Boolean";
})(ColumnType = exports.ColumnType || (exports.ColumnType = {}));
class TableStructor {
    constructor(tableName, columns, constraint) {
        columns.forEach(x => {
            x.columnName = (0, SqlQueryBuilder_1.getColumns)(x.columnName);
        });
        constraint === null || constraint === void 0 ? void 0 : constraint.forEach(x => {
            x.columnName = (0, SqlQueryBuilder_1.getColumns)(x.columnName);
        });
        this.tableName = tableName;
        this.columns = columns;
        this.constraints = constraint;
    }
}
exports.default = TableStructor;
//# sourceMappingURL=TableStructor.js.map