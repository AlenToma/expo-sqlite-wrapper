"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Param = exports.IBaseModule = void 0;
class IBaseModule {
    constructor(tableName, id) {
        this.tableName = tableName;
        this.id = id !== null && id !== void 0 ? id : 0;
    }
}
exports.IBaseModule = IBaseModule;
var Param;
(function (Param) {
    Param["StartParameter"] = "#(";
    Param["EqualTo"] = "#=";
    Param["EndParameter"] = "#)";
    Param["OR"] = "#OR";
    Param["AND"] = "#AND";
    Param["LessThan"] = "#<";
    Param["GreaterThan"] = "#>";
    Param["IN"] = "#IN";
    Param["NotIn"] = "#NOT IN";
    Param["NULL"] = "#IS NULL";
    Param["NotNULL"] = "#IS NOT NULL";
    Param["NotEqualTo"] = "#!=";
    Param["Contains"] = "#like";
    Param["StartWith"] = "S#like";
    Param["EndWith"] = "E#like";
    Param["EqualAndGreaterThen"] = "#>=";
    Param["EqualAndLessThen"] = "#<=";
})(Param = exports.Param || (exports.Param = {}));
//# sourceMappingURL=expo.sql.wrapper.types.js.map