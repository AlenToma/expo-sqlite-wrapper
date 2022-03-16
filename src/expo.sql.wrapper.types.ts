import TablaStructor from "./TableStructor";
import * as SqlLite from 'expo-sqlite'

export class IBaseModule<D extends string> {
    public id: number;
    public tableName: D;

    constructor(tableName: D, id?: number) {
        this.tableName = tableName;
        this.id = id ?? 0;
    }
}

export type Operation = "UPDATE" | "INSERT";
export declare type SingleValue = string | number | boolean | undefined | null;
export declare type ArrayValue = any[] | undefined;
export declare type NumberValue = number | undefined;
export declare type StringValue = string | undefined;


export interface IChildQueryLoader<T, B, D extends string> {
    With: <E>(item: string | ((x: E) => any)) => IChildQueryLoader<T, B, D>;
    AssignTo: <S, E>(item: ((x: B) => E) | string) => IQuery<B, D>;
}

export interface IWatcher<T, D extends string> {
    onSave?: (item: T[], operation: Operation) => Promise<void>;
    onDelete?: (item: T[]) => Promise<void>;
    readonly removeWatch: () => void;
}

export interface IChildLoader<D extends string> {
    parentProperty: string;
    parentTable: D;
    childProperty: string;
    childTableName: D;
    assignTo: string;
    isArray: boolean;
}



export enum Param {
    StartParameter = '#(',
    EqualTo = '#=',
    EndParameter = '#)',
    OR = '#OR',
    AND = '#AND',
    LessThan = '#<',
    GreaterThan = '#>',
    IN = '#IN',
    NotIn = '#NOT IN',
    NULL = '#IS NULL',
    NotNULL = "#IS NOT NULL",
    NotEqualTo = '#!=',
    Contains = '#like',
    StartWith = "S#like",
    EndWith = "E#like",
    EqualAndGreaterThen = '#>=',
    EqualAndLessThen = '#<=',
    OrderByDesc = "#Order By #C DESC",
    OrderByAsc = "#Order By #C ASC",
    Limit = "#Limit #Counter",

}

export interface IQuaryResult<D extends string> {
    sql: string;
    values: any[];
    children: IChildLoader<D>[];
}

export interface IQuery<T, D extends string> {
    Column: <B>(item: ((x: T) => B) | string) => IQuery<T, D>;
    EqualTo: (value: SingleValue) => IQuery<T, D>;
    Contains: (value: StringValue) => IQuery<T, D>;
    StartWith: (value: StringValue) => IQuery<T, D>;
    EndWith: (value: StringValue) => IQuery<T, D>;
    NotEqualTo: (value: SingleValue) => IQuery<T, D>;
    EqualAndGreaterThen: (value: NumberValue | StringValue) => IQuery<T, D>;
    EqualAndLessThen: (value: NumberValue | StringValue) => IQuery<T, D>;
    Start: () => IQuery<T, D>;
    End: () => IQuery<T, D>;
    OR: () => IQuery<T, D>;
    AND: () => IQuery<T, D>;
    GreaterThan: (value: NumberValue | StringValue) => IQuery<T, D>;
    LessThan: (value: NumberValue | StringValue) => IQuery<T, D>;
    IN: (value: ArrayValue) => IQuery<T, D>;
    NotIn: (value: ArrayValue) => IQuery<T, D>;
    Null: () => IQuery<T, D>;
    NotNull: () => IQuery<T, D>;
    OrderByDesc: <B>(item: ((x: T) => B) | string) => IQuery<T, D>;
    OrderByAsc: <B>(item: ((x: T) => B) | string) => IQuery<T, D>;
    Limit: (value: number) => IQuery<T, D>;
    LoadChildren: <B>(childTableName: D, parentProperty: ((x: T) => B) | string) => IChildQueryLoader<B, T, D>;
    LoadChild: <B>(childTableName: D, parentProperty: ((x: T) => B) | string) => IChildQueryLoader<B, T, D>
    delete: ()=> Promise<void>;
    firstOrDefault: () => Promise<IQueryResultItem<T, D> | undefined>;
    findOrSave: (item: T & IBaseModule<D>) => Promise<IQueryResultItem<T, D>>;
    toList: () => Promise<IQueryResultItem<T, D>[]>;
    getQueryResult: (operation?: "SELECT" | "DELETE") => IQuaryResult<D>;
}

export type IQueryResultItem<T, D extends string> = T & {
    savechanges: () => Promise<IQueryResultItem<T, D>>,
    delete: () => Promise<void>

};


export interface IDatabase<D extends string> {
    isClosed?: boolean,
    // Its importend that,createDbContext return new data database after this is triggered
    tryToClose: (name: string) => Promise<boolean>,
    allowedKeys: (tableName: D) => Promise<string[]>;
    asQueryable: <T>(item: T & IBaseModule<D>, tableName?: D) => Promise<IQueryResultItem<T, D>>
    watch: <T>(tableName: D) => IWatcher<T, D>;
    query: <T>(tableName: D) => IQuery<T, D>;
    find: (query: string, args?: any[], tableName?: D) => Promise<IBaseModule<D>[]>
    save: <T>(item: (T & IBaseModule<D>) | ((T & IBaseModule<D>)[]), insertOnly?: Boolean, tableName?: D) => Promise<T[]>;
    where: <T>(tableName: D, query?: any | T) => Promise<T[]>;
    delete: (item: IBaseModule<D> | (IBaseModule<D>[]), tableName?: D) => Promise<void>;
    execute: (query: string, args?: any[]) => Promise<boolean>;
    dropTables: () => Promise<void>;
    setUpDataBase: (forceCheck?: boolean) => Promise<void>;
    tableHasChanges: <T>(item: TablaStructor<T, D>) => Promise<boolean>;
    executeRawSql: (queries: SqlLite.Query[], readOnly: boolean) => Promise<void>;
    // close and open the db every ms.
    // the db will be able to refresh only if there is no db operation is ongoing
    startRefresher: (ms: number, dbName: string)=> void;
}