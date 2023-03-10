import { IBaseModule, SingleValue, ArrayValue, StringValue, NumberValue, IQuery, IQueryResultItem, IDatabase, IWatcher, ColumnType, } from './expo.sql.wrapper.types'
import createDbContext from './Database'
import TableBuilder from './TableStructor'
import BulkSave from './BulkSave'
import { Functions } from './UsefullMethods'
import { IQuerySelector, IReturnMethods, IOrderBy, GenericQuery, JoinOn, IWhere, IHaving, IQueryColumnSelector, IColumnSelector, ArrayIColumnSelector, ArrayAndAliasIColumnSelector } from './QuerySelector'

export default createDbContext
const { encrypt, decrypt, oDecrypt, oEncypt } = Functions
export {
    TableBuilder,
    IBaseModule,
    BulkSave,
    encrypt,
    decrypt,
    oDecrypt,
    oEncypt
}
export type {
    SingleValue,
    ArrayValue,
    NumberValue,
    StringValue,
    IQuery,
    IQueryResultItem,
    IDatabase,
    IWatcher,
    IQuerySelector,
    IReturnMethods,
    IOrderBy,
    GenericQuery,
    JoinOn,
    IWhere,
    IHaving,
    IQueryColumnSelector,
    ColumnType,
    IColumnSelector,
    ArrayIColumnSelector,
    ArrayAndAliasIColumnSelector
}
