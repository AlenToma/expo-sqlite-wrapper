import * as SqlLite from 'expo-sqlite'
import { TableBuilder } from './TableStructor';
import BulkSave from './BulkSave';
import { IReturnMethods, IQuerySelector } from './QuerySelector';

export type ColumnType = 'Number' | 'String' | 'Decimal' | 'Boolean' | "DateTime";

export type NonFunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T];

export type ITableBuilder<T, D extends string> = {
    /**
     * column can contain nullable value 
     */
    nullable: ITableBuilder<T, D>;
    /**
     * isPrimary key
     */
    primary: ITableBuilder<T, D>;
    /**
     * work togather with isPrimary, autoIncrement value on insert
     */
    autoIncrement: ITableBuilder<T, D>;
    /**
     * save method will check if this column value exist in the table, if it dose then it will update insted.
     * this will only be check if id is not set
     */
    unique: ITableBuilder<T, D>;
    /**
     * column of type boolean
     */
    boolean: ITableBuilder<T, D>;
    /**
     * column of type integer
     */
    number: ITableBuilder<T, D>;
    /**
     * column of type decimal
     */
    decimal: ITableBuilder<T, D>;
    /**
     * column of type string
     */
    string: ITableBuilder<T, D>;
    /**
     * column of type datetime
     */
    dateTime: ITableBuilder<T, D>;
    /**
     * encrypt the column
     */
    encrypt: (encryptionKey: string) => ITableBuilder<T, D>;
    /**
     * add column to table and specify its props there after, eg boolean, number etc 
     */
    column: (colName: NonFunctionPropertyNames<T>) => ITableBuilder<T, D>;
    /**
     * add a foreign key to the table
     */
    constrain: <E>(columnName: NonFunctionPropertyNames<T>, contraintTableName: D, contraintColumnName: NonFunctionPropertyNames<E>) => ITableBuilder<T, D>;
    /**
     * sqlite return json object, with this convert it to class object instead
     */
    onItemCreate: (func: (item: T) => T) => ITableBuilder<T, D>;
    /**
     * if not using onItemCreate then use this to convert json item to class 
     * note: this will ignore the constructor
     * example 
class Test {
  name: String;
  passowrd: String;
  constructor(name: string, passowrd: string){
    this.name = name;
    this.passowrd = passowrd;
  }

  get getName(){
    return this.name;
  }
}
    .objectPrototype(Test.prototype)
     */
    objectPrototype: (objectProptoType: any) => ITableBuilder<T, D>;
};

export class IId<D extends string>{
    public id: number;
    constructor(id?: number) {
        this.id = id ?? id;
    }
}

export class IBaseModule<D extends string> extends IId<D> {
    public tableName: D;

    constructor(tableName: D, id?: number) {
        super(id);
        this.tableName = tableName;
    }
}

export type Operation = "UPDATE" | "INSERT";
export type SOperation = "onSave" | "onDelete" | "onBulkSave";
export declare type SingleValue = string | number | boolean | Date | undefined | null;
export declare type ArrayValue = any[] | undefined;
export declare type NumberValue = number | undefined;
export declare type StringValue = string | undefined;

export type IDataBaseExtender<D extends string> = {
    tables: TableBuilder<any, D>[];
    dbTable: TableBuilder<any, D>[];
    triggerWatch: <T extends IBaseModule<D>>(items: T | T[], operation: SOperation, subOperation?: Operation, tableName?: D) => Promise<void>;
} & IDatabase<D>

export interface IChildQueryLoader<T, B extends IId<D>, D extends string> {
    With: <E>(columnName: NonFunctionPropertyNames<E>) => IChildQueryLoader<T, B, D>;
    AssignTo: <S, E>(columnName: NonFunctionPropertyNames<B>) => IQuery<B, D>;
}

export type WatchIdentifier = "Hook" | "Other";

export type TempStore<D extends string> = {
    operation: SOperation,
    subOperation?: Operation,
    tableName: D,
    items: IBaseModule<D>[];
    identifier?: WatchIdentifier
}

export interface IWatcher<T, D extends string> {
    onSave?: (item: T[], operation: Operation) => Promise<void>;
    onDelete?: (item: T[]) => Promise<void>;
    onBulkSave?: () => Promise<void>;
    readonly removeWatch: () => void;
    identifier: WatchIdentifier;
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


export interface IQuery<T extends IId<D>, D extends string> {
    Column: (columnName: NonFunctionPropertyNames<T>) => IQuery<T, D>;
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
    OrderByDesc: (columnName: NonFunctionPropertyNames<T>) => IQuery<T, D>;
    OrderByAsc: (columnName: NonFunctionPropertyNames<T>) => IQuery<T, D>;
    Limit: (value: number) => IQuery<T, D>;
    LoadChildren: <B extends IId<D>>(childTableName: D, parentProperty: NonFunctionPropertyNames<T>) => IChildQueryLoader<B, T, D>;
    LoadChild: <B extends IId<D>>(childTableName: D, parentProperty: NonFunctionPropertyNames<T>) => IChildQueryLoader<B, T, D>
    delete: () => Promise<void>;
    firstOrDefault: () => Promise<IQueryResultItem<T, D> | undefined>;
    findOrSave: (item: T & IBaseModule<D>) => Promise<IQueryResultItem<T, D>>;
    toList: () => Promise<IQueryResultItem<T, D>[]>;
    getQueryResult: (operation?: "SELECT" | "DELETE") => IQuaryResult<D>;
}

export type IQueryResultItem<T, D extends string> = T & {
    savechanges: () => Promise<IQueryResultItem<T, D>>,
    delete: () => Promise<void>,
    update: (...keys: (NonFunctionPropertyNames<T>)[]) => Promise<void>
};


const OUseQuery = <T extends IId<D>, D extends string>(tableName: D,
    query: (IQuery<T, D>) | (SqlLite.Query) | (IReturnMethods<T, D>) | (() => Promise<T[]>),
    onDbItemsChanged?: (items: T[]) => T[]
) => ([[] as IQueryResultItem<T, D>[], {} as boolean, new Function() as () => Promise<void>, {} as IDatabase<D>] as const)

export type IUseQuery = typeof OUseQuery;

export interface IDatabase<D extends string> {
    /**
     * This is a hook you could use in a component
     */
    useQuery: IUseQuery;

    /**
     * Freeze all watchers, this is usefull when for example doing many changes to the db
     * and you dont want the watchers to be triggerd many times
     */
    disableWatchers: () => IDatabase<D>;
    /**
     * enabling Watchers will call all the frozen watchers that has not been called when it was frozen
     */
    enableWatchers: () => Promise<void>;

    /**
    * Freeze all hooks, this is usefull when for example doing many changes to the db
    * and you dont want the hooks to be triggerd(rerender components) many times
    */
    disableHooks: () => IDatabase<D>;

    /**
    * enabling Hooks will call all the frozen hooks that has not been called when it was frozen
    */
    enableHooks: () => Promise<void>;

    /**
     * BulkSave object
     * This will only watchers.onBulkSave
     */
    bulkSave: <T extends IBaseModule<D>>(tabelName: D) => Promise<BulkSave<T, D>>;

    isClosed?: boolean,
    /**
     * Its importend that,createDbContext return new database after this is triggered
     */
    tryToClose: () => Promise<boolean>;
    /**
     * Its importend that,createDbContext return new database after this is triggered
     */
    close: () => Promise<void>;
    /**
     * begin transaction
     */
    beginTransaction: () => Promise<void>;
    /**
     * comit the transaction
     */
    commitTransaction: () => Promise<void>;
    /**
     * rollback the transaction
     */
    rollbackTransaction: () => Promise<void>;
    /**
    Auto close the db after every ms.
    The db will be able to refresh only if there is no db operation is ongoing.
    This is useful, so that it will use less memory as SQlite tends to store transaction in memories which causes the increase in memory over time.
    its best to use ms:3600000
    the db has to be ideal for ms to be able to close it.
    */
    startRefresher: (ms: number) => void;
    /**
     * return column name for the specific table
     */
    allowedKeys: (tableName: D) => Promise<string[]>;
    /**
     * convert json to IQueryResultItem object, this will add method as savechanges, update and delete methods to an object
     */
    asQueryable: <T extends IId<D>>(item: IId<D> | IBaseModule<D>, tableName?: D) => Promise<IQueryResultItem<T, D>>
    watch: <T extends IId<D>>(tableName: D) => IWatcher<T, D>;
    /**
     * Create IQuery object.
     * @deprecated since version 1.4.3 use querySelector instead
     */
    query: <T extends IId<D>>(tableName: D) => IQuery<T, D>;

    /**
     * More advanced queryBuilder
     * It include join and aggregators and better validations
     */
    querySelector: <T extends IId<D>>(tabelName: D) => IQuerySelector<T, D>;
    /**
     * execute sql eg
     * query: select * from users where name = ?
     * args: ["test"]
     */
    find: (query: string, args?: any[], tableName?: D) => Promise<IBaseModule<D>[]>
    /**
     * trigger save, update will depend on id and unique columns
     */
    save: <T extends IId<D>>(item: (T) | ((T)[]), insertOnly?: Boolean, tableName?: D, saveAndForget?: boolean) => Promise<T[]>;
    where: <T extends IId<D>>(tableName: D, query?: any | T) => Promise<T[]>;
    /**
     * this method translate json-sql to sqlite select.
     * for more info about this read json-sql documentations 
     * https://github.com/2do2go/json-sql/tree/4be018c0662dacba06ddf033d18e71ebf93ee7c3/docs
     * example 
     * {
        type: 'select',
        table: 'DetaliItems',
        condition:{"DetaliItems.id":{$gt: 1}, "DetaliItems.title": "Epic Of Caterpillar"},  
        join: {
        Chapters: {
            on: {'DetaliItems.id': 'Chapters.detaliItem_Id'} 
            }
        }
      }
     */
    jsonToSql: <T>(jsonQuery: any, tableName?: D) => Promise<T[]>;
    /**
     * delete object based on Id
     */
    delete: (item: IId<D> | (IId<D>[]), tableName?: D) => Promise<void>;
    /**
     * execute sql without returning anyting
     */
    execute: (query: string, args?: any[]) => Promise<boolean>;
    /**
     * Drop all tables
     */
    dropTables: () => Promise<void>;
    /**
     * Setup your table, this will only create a table if it dose not exist 
     */
    setUpDataBase: (forceCheck?: boolean) => Promise<void>;
    /**
     * find out if there some changes between object and db table
     */
    tableHasChanges: <T extends IBaseModule<D>>(item: ITableBuilder<T, D>) => Promise<boolean>;
    /**
     * execute an array of sql
     */
    executeRawSql: (queries: SqlLite.Query[], readOnly: boolean) => Promise<void>;

}