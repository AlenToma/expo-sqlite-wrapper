import { ColumnType, IColumnProps, ITableBuilder } from './expo.sql.wrapper.types'


class ColumnProps<T extends object, D extends string> {
    columnType: ColumnType;
    isNullable?: boolean;
    columnName: keyof T;
    isPrimary?: boolean;
    isAutoIncrement?: boolean;
    isUnique?: boolean;
    onColumn: (colName: keyof T) => ColumnProps<T, D>;
    encryptionKey?: string;
    tableName: D;
    constructor(
        tableName: D,
        columnName: keyof T,
        onColumn: (colName: keyof T) => ColumnProps<T, D>
      
    ) {
        this.columnName = columnName;
        this.columnType = 'String';
        this.onColumn = onColumn;
        this.tableName = tableName;
    }

    colType(colType: ColumnType) {
        if (colType !== "String" && this.encryptionKey) {
            const ms = `Error:Encryption can only be done to columns with String Types. (${this.tableName}.${this.columnName as string})`
            console.error(ms)
            throw ms;
        }
        this.columnType = colType;
        return this;
    }

    get nullable() {
        this.isNullable = true;
        return this;
    }

    get primary() {
        this.isPrimary = true;
        return this;
    }

    get autoIncrement() {
        this.isAutoIncrement = true;
        return this;
    }

    get unique() {
        this.isUnique = true;
        return this;
    }

    encrypt(encryptionKey: string) {
        if (this.columnType !== "String") {
            const ms = `Error:Encryption can only be done to columns with String Types. (${this.tableName}.${this.columnName as string})`
            console.error(ms)
            throw ms;
        }
        this.encryptionKey = encryptionKey;
        return this;
    }

    column(colName: keyof T) {
        return this.onColumn(colName);
    }
}

export class TableBuilder<T extends object, D extends string> {
    props: ColumnProps<T, D>[];
    constrains: { columnName: keyof T, contraintTableName: D, contraintColumnName: any }[];
    tableName: D;
    itemCreate?: (item: T) => T;
    constructor(tableName: D) {
        this.props = [];
        this.tableName = tableName;
        this.constrains = [];
    }

    onItemCreate(func: (item: T) => T) {
        this.itemCreate = func;
        return this;
    }

    column(colName: keyof T) {
        const func = this.column.bind(this) as any;
        const col = new ColumnProps<T, D>(this.tableName, colName, func);
        this.props.push(col);
        return col as any as IColumnProps<T, D>;
    }

    constrain<E extends object>(columnName: keyof T, contraintTableName: D, contraintColumnName: keyof E) {
        this.constrains.push({ columnName, contraintColumnName, contraintTableName });
        return this;
    }
}

export default <T extends object, D extends string>(tableName: D) => {
    return new TableBuilder<T, D>(tableName) as ITableBuilder<T, D>;
}

