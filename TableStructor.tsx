export enum ColumnType {
    Number,
    String,
    Decimal,
    Boolean
}

export interface IConstraint{
    columnName: string;
    contraintTableName:string;
    contraintColumnName:string;
}

export interface IColumnStructor {
    columnType: ColumnType;
    nullable?: boolean;
    columnName: string;
    isPrimary?: boolean;
    autoIncrement?: boolean;
    isUique?: boolean;
}

export default class TableStructor<D extends string> {
    tableName: D;
    columns: IColumnStructor[];
    constraints?:IConstraint[];
    
    constructor(tableName: D, columns:IColumnStructor[], constraint?:IConstraint[]){
        this.tableName = tableName;
        this.columns = columns;
        this.constraints = constraint;
    }

}