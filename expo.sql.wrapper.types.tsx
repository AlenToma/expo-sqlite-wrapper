import TablaStructor from "./TableStructor";

export class IBaseModule<D extends string> {
    public id: number;
    public tableName: D;

    constructor(tableName: D, id?: number) {
        this.tableName = tableName;
        this.id = id ?? 0;
    }
}

export declare type SingleValue = string | number | boolean | undefined | null;
export declare type ArrayValue = any[] | undefined;
export declare type NumberValue = number | undefined;


export interface IChildQueryLoader<T, B, D extends string> {
    With: <E>(item: (x: E) => any) => IChildQueryLoader<T, B, D>;
    AssignTo: <S, E>(item: (x: B) => E) => IQuery<B, D>;
}

export interface IWatcher<T, D extends string> {
    onSave?: (item: T[]) => Promise<boolean | undefined>;
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
    NULL = '#NULL',
    NotEqualTo = '#!=',
    EqualAndGreaterThen = '#>=',
    EqualAndLessThen = '#<=',
}

export interface IQuaryResult<D extends string> {
    sql: string;
    values: any[];
    children: IChildLoader<D>[];
}

export interface IQuery<T, D extends string> {
    Column: <B>(item: (x: T) => B) => IQuery<T, D>;
    EqualTo: <B>(value: ((x: T) => B) | SingleValue) => IQuery<T, D>;
    NotEqualTo: <B>(value: ((x: T) => B) | SingleValue) => IQuery<T, D>;
    EqualAndGreaterThen: <B>(value: ((x: T) => B) | NumberValue) => IQuery<T, D>;
    EqualAndLessThen: <B>(value: ((x: T) => B) | NumberValue) => IQuery<T, D>;
    Start: () => IQuery<T, D>;
    End: () => IQuery<T, D>;
    OR: () => IQuery<T, D>;
    AND: () => IQuery<T, D>;
    GreaterThan: <B>(value: ((x: T) => B) | NumberValue) => IQuery<T, D>;
    LessThan: <B>(value: ((x: T) => B) | NumberValue) => IQuery<T, D>;
    IN: <B>(value: ((x: T) => B) | ArrayValue) => IQuery<T, D>;
    NotIn: () => IQuery<T, D>;
    Null: () => IQuery<T, D>;
    LoadChildren: <B>(childTableName: D, parentProperty: (x: T) => B) => IChildQueryLoader<B, T, D>;
    LoadChild: <B>(childTableName: D, parentProperty: (x: T) => B) => IChildQueryLoader<B, T, D>
    firstOrDefault: () => Promise<IQueryResultItem<T, D> | undefined>;
    findOrSave: (item: IBaseModule<D>) => Promise<IQueryResultItem<T, D>>;
    toList: () => Promise<IQueryResultItem<T, D>[]>;
    getQueryResult: () => IQuaryResult<D>;
}



export type IQueryResultItem<T, D extends string> = T & {
    savechanges:() => Promise<IQueryResultItem<T, D>>,
    delete: () => Promise<void>

};

export interface IDatabase<D extends string> {
    allowedKeys: (tableName: D) => Promise<string[]>;
    asQueryable: <T>(item: IBaseModule<D>, tableName?: D) => Promise<IQueryResultItem<T, D>>
    watch: <T>(tableName: D) => IWatcher<T, D>;
    query: <T>(tableName: D) => IQuery<T, D>;
    find: (query: string, args?: any[], tableName?: D) => Promise<IBaseModule<D>[]>
    save: <T>(item?: IBaseModule<D> | (IBaseModule<D>[]), insertOnly?: Boolean, tableName?: D) => Promise<T[]>;
    where: <T>(tableName: D, query?: any | T) => Promise<T[]>;
    delete: (item: IBaseModule<D> | (IBaseModule<D>[]), tableName?: D) => Promise<void>;
    execute: (query: string, args?: any[]) => Promise<boolean>;
    dropTables: () => Promise<void>;
    setUpDataBase: (forceCheck?: boolean) => Promise<void>;
    tableHasChanges: (item: TablaStructor<D>) => Promise<boolean>;
}