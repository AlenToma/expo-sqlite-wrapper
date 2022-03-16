export declare enum ColumnType {
    Number = 0,
    String = 1,
    Decimal = 2,
    Boolean = 3
}
export interface IConstraint<T, D extends string> {
    columnName: string | ((x: T) => any);
    contraintTableName: D;
    contraintColumnName: string;
}
export interface IColumnStructor<T> {
    columnType: ColumnType;
    nullable?: boolean;
    columnName: string | ((x: T) => any);
    isPrimary?: boolean;
    autoIncrement?: boolean;
    isUique?: boolean;
}
export default class TableStructor<T, D extends string> {
    tableName: D;
    columns: IColumnStructor<T>[];
    constraints?: IConstraint<T, D>[];
    constructor(tableName: D, columns: IColumnStructor<T>[], constraint?: IConstraint<T, D>[]);
}