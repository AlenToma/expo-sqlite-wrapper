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
```js
export interface IDatabase<D extends string> {
    isClosed?: boolean,
    // Its importend that,createDbContext return new database after this is triggered
    tryToClose: () => Promise<boolean>,
    close: () => Promise<void>;
    beginTransaction: () => Promise<void>;
    commitTransaction: () => Promise<void>;
    rollbackTransaction: () => Promise<void>;
    // Auto close the db after every ms.
    // The db will be able to refresh only if there is no db operation is ongoing.
    // This is useful, so that it will use less memory as SQlite tends to store transaction in memories which causes the increase in memory over time.
    // its best to use ms:3600000
    // the db has to be ideal for ms to be able to close it.
    startRefresher: (ms: number) => void;
    allowedKeys: (tableName: D) => Promise<string[]>;
    asQueryable: <T>(item: T & IBaseModule<D>, tableName?: D) => Promise<IQueryResultItem<T, D>>
    watch: <T>(tableName: D) => IWatcher<T, D>;
    query: <T>(tableName: D) => IQuery<T, D>;
    find: (query: string, args?: any[], tableName?: D) => Promise<IBaseModule<D>[]>
    save: <T>(item: (T & IBaseModule<D>) | ((T & IBaseModule<D>)[]), insertOnly?: Boolean, tableName?: D, saveAndForget?: boolean) => Promise<T[]>;
    where: <T>(tableName: D, query?: any | T) => Promise<T[]>;
    delete: (item: IBaseModule<D> | (IBaseModule<D>[]), tableName?: D) => Promise<void>;
    execute: (query: string, args?: any[]) => Promise<boolean>;
    dropTables: () => Promise<void>;
    setUpDataBase: (forceCheck?: boolean) => Promise<void>;
    tableHasChanges: <T>(item: ITableBuilder<T, D>) => Promise<boolean>;
    executeRawSql: (queries: SqlLite.Query[], readOnly: boolean) => Promise<void>;
}
```

Please report any issues that you find so we could make this lib even better.

