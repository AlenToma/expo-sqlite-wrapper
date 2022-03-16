"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IBaseModule = exports.ColumnType = exports.TableStructor = void 0;
const expo_sql_wrapper_types_1 = require("./expo.sql.wrapper.types");
Object.defineProperty(exports, "IBaseModule", { enumerable: true, get: function () { return expo_sql_wrapper_types_1.IBaseModule; } });
const Database_1 = __importDefault(require("./Database"));
const TableStructor_1 = __importStar(require("./TableStructor"));
exports.TableStructor = TableStructor_1.default;
Object.defineProperty(exports, "ColumnType", { enumerable: true, get: function () { return TableStructor_1.ColumnType; } });
exports.default = Database_1.default;
//# sourceMappingURL=index.js.map