# expo-sqlite-wrapper
 This is an ORM, build around `expo-sqlite`. It will make operation like `UPDATE`, `SELECT` AND `INSERT` a lot easier to handle
 
 ## Installations
```sh
 npm install expo-sqlite expo-sqlite-wrapper
```
Installation for `expo-sqlite` read https://docs.expo.dev/versions/latest/sdk/sqlite/

## Documentations
* [Modules Setup](https://github.com/AlenToma/expo-sqlite-wrapper/blob/main/documentations/SetupModules.md)
* [DbContext](https://github.com/AlenToma/expo-sqlite-wrapper/blob/main/documentations/dbContexts.md)
* [select and save operations](https://github.com/AlenToma/expo-sqlite-wrapper/blob/main/documentations/Select_and_Save.md)
* [Watch the db operations](https://github.com/AlenToma/expo-sqlite-wrapper/blob/main/documentations/Watcher.md)

### IQuery
```js
export interface IQuery<T, D extends string> {
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
    LoadChildren: <B>(childTableName: D, parentProperty: NonFunctionPropertyNames<T>) => IChildQueryLoader<B, T, D>;
    LoadChild: <B>(childTableName: D, parentProperty: NonFunctionPropertyNames<T>) => IChildQueryLoader<B, T, D>
    delete: () => Promise<void>;
    firstOrDefault: () => Promise<IQueryResultItem<T, D> | undefined>;
    findOrSave: (item: T & IBaseModule<D>) => Promise<IQueryResultItem<T, D>>;
    toList: () => Promise<IQueryResultItem<T, D>[]>;
    getQueryResult: (operation?: "SELECT" | "DELETE") => IQuaryResult<D>;
}
```

### IDatabase
```ts
export interface IDatabase<D extends string> {
     /**
     * BulkSave object
     * this will not trigger watchers.
     */
    bulkSave: <T>(tabelName: D) => Promise<BulkSave<T, D>>;
    
    isClosed?: boolean;
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
    asQueryable: <T>(item: T & IBaseModule<D>, tableName?: D) => Promise<IQueryResultItem<T, D>>;
    watch: <T>(tableName: D) => IWatcher<T, D>;
    /**
     * Create IQuery object.
     */
    query: <T>(tableName: D) => IQuery<T, D>;
    /**
     * execute sql eg
     * query: select * from users where name = ?
     * args: ["test"]
     */
    find: (query: string, args?: any[], tableName?: D) => Promise<IBaseModule<D>[]>;
    /**
     * trigger save, update will depend on id and unique columns
     */
    save: <T>(item: (T & IBaseModule<D>) | ((T & IBaseModule<D>)[]), insertOnly?: Boolean, tableName?: D, saveAndForget?: boolean) => Promise<T[]>;
    where: <T>(tableName: D, query?: any | T) => Promise<T[]>;
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
    delete: (item: IBaseModule<D> | (IBaseModule<D>[]), tableName?: D) => Promise<void>;
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
    tableHasChanges: <T>(item: ITableBuilder<T, D>) => Promise<boolean>;
    /**
     * execute an array of sql
     */
    executeRawSql: (queries: SqlLite.Query[], readOnly: boolean) => Promise<void>;
}

```

Please report any issues that you find so we could make this lib even better.

