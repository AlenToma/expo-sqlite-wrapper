import { IBaseModule, SingleValue, ArrayValue, NumberValue, IQuery, IQueryResultItem, IDatabase } from './expo.sql.wrapper.types'
import createDbContext from './Database'
import TablaStructor, { ColumnType } from './TableStructor'


export default createDbContext

export {
    TablaStructor,
    ColumnType
}
export type {
    IBaseModule,
    SingleValue,
    ArrayValue,
    NumberValue,
    IQuery,
    IQueryResultItem,
    IDatabase
}
