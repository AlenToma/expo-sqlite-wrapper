import { ColumnType, ITableBuilder } from './expo.sql.wrapper.types'


interface ColumnProps<T, D extends string> {
    columnType: ColumnType;
    isNullable?: boolean;
    columnName: keyof T;
    isPrimary?: boolean;
    isAutoIncrement?: boolean;
    isUnique?: boolean;
    encryptionKey?: string;
}

export class TableBuilder<T, D extends string> {
    props: ColumnProps<T, D>[];
    constrains: { columnName: keyof T, contraintTableName: D, contraintColumnName: any }[];
    tableName: D;
    itemCreate?: (item: T) => T;
    constructor(tableName: D) {
        this.props = [];
        this.tableName = tableName;
        this.constrains = [];
    }

    colType(colType: ColumnType) {
        if (colType !== "String" && this.getLastProp.encryptionKey) {
            const ms = `Error:Encryption can only be done to columns with String Types. (${this.tableName}.${this.getLastProp.columnName as string})`
            console.error(ms)
            throw ms;
        }
        this.getLastProp.columnType = colType;
        return this;
    }

    get boolean() {
        return this.colType("Boolean");
    }

    get number() {
        return this.colType("Number");
    }

    get decimal() {
        return this.colType("Decimal");
    }

    get string() {
        return this.colType("String");
    }

    get dateTime() {
        return this.colType("DateTime");
    }

    get nullable() {
        this.getLastProp.isNullable = true;
        return this;
    }

    get primary() {
        this.getLastProp.isPrimary = true;
        return this;
    }

    get autoIncrement() {
        this.getLastProp.isAutoIncrement = true;
        return this;
    }

    get unique() {
        this.getLastProp.isUnique = true;
        return this;
    }

    encrypt(encryptionKey: string) {
        if (this.getLastProp.columnType !== "String") {
            const ms = `Error:Encryption can only be done to columns with String Types. (${this.tableName}.${this.getLastProp.columnName as string})`
            console.error(ms)
            throw ms;
        }
        this.getLastProp.encryptionKey = encryptionKey;
        return this;
    }

    get getLastProp(){
        if (this.props.length>0)
            return this.props[this.props.length-1];
        return {} as ColumnProps<T, D>;
    }

    onItemCreate(func: (item: T) => T) {
        this.itemCreate = func;
        return this;
    }

    column(colName: keyof T) {
        const col = {columnName: colName, columnType: "String"} as ColumnProps<T,D>
        this.props.push(col);
        return this;
    }

    constrain<E extends object>(columnName: keyof T, contraintTableName: D, contraintColumnName: keyof E) {
        this.constrains.push({ columnName, contraintColumnName, contraintTableName });
        return this;
    }
}

export default <T extends object, D extends string>(tableName: D) => {
    return new TableBuilder<T, D>(tableName) as ITableBuilder<T, D>;
}

