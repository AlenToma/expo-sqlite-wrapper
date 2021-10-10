import { IBaseModule, SingleValue, ArrayValue, NumberValue, IQuery, IQueryResultItem, IDatabase, IWatcher } from './expo.sql.wrapper.types'
import createDbContext from './Database'
import TableStructor, { ColumnType } from './TableStructor'


export default createDbContext

export {
    TableStructor,
    ColumnType,
    IBaseModule
}
export type {
    SingleValue,
    ArrayValue,
    NumberValue,
    IQuery,
    IQueryResultItem,
    IDatabase,
    IWatcher
}
