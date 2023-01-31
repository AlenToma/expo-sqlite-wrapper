# expo-sqlite-wrapper
 This is an ORM, build around `expo-sqlite`. It will make operation like `UPDATE`, `SELECT` AND `INSERT` a lot easier to handle
 
 ## Installations
```sh
 npm install expo-sqlite expo-sqlite-wrapper
```
Installation for `expo-sqlite` read https://docs.expo.dev/versions/latest/sdk/sqlite/

## Usage
### SetupModules
```js
"show source" // this is only specific for hermes installations, read below to understand more about this.
import  { IBaseModule, TableStructor, ColumnType, IQueryResultItem } from 'expo-sqlite-wrapper'
export type TableNames = "Parents" | "Childrens";

export class Parent extends IBaseModule<TableNames>{
 name: string;
 email: string;
 // Using IQueryResultItem is optional, you could simple use Child[]
 children: IQueryResultItem<Child,TableNames>[];
 constructor(name:string, email: string ){
   super("Parents");
   this.name = name;
   this.email = email;
   this.children = [];
 }
 
  static GetTableStructor() {
    return new TableStructor<Parent, TableNames>(
      "Parents",
      [
        { columnName: "id", columnType: ColumnType.Number, nullable: false, isPrimary: true, autoIncrement: true },
        { columnName: "name", columnType: ColumnType.String },
        //isUnique acts as an Id too as the library will chack if there exist an item with the same field value and will update instead.
         { columnName: "email", columnType: ColumnType.String, isUnique: true } 
      ]
    )
  }
}


export class Child extends IBaseModule<TableNames>{
 someField: string;
 parentId?: number;
 constructor(someField:string, parentId?: number ){
   super("Childrens");
   this.someField = someField;
   this.parentId = parentId;
 }
  
  static GetTableStructor() {
    return new TableStructor<Child, TableNames>(
      "Childrens",
      [
        { columnName: "id", columnType: ColumnType.Number, nullable: false, isPrimary: true, autoIncrement: true },
        { columnName: "someField", columnType: ColumnType.String },
        { columnName: "parentId", columnType: ColumnType.Number, nullable: true },
      ],
       [
        { contraintTableName: "Parents", contraintColumnName: "id", columnName: x=> x.parentId }
      ], 
      // You could always handle how the item gets created when its returned from the database.
      // The database return a json item, if you want to convert it to class then use this(onItemCreate) to generate the class
      (item: T)=> {
           var child= new Child(item.someField, item.parentId);
           child.id= item.id;
           return child;
      } 
    )
  }
}

```

### Setup dbContexts

```ts
import createDbContext, { IDatabase, IQueryResultItem, IBaseModule } from 'expo-sqlite-wrapper'
import * as SQLite from 'expo-sqlite';
const tables = [Parent.GetTableStructor(), Child.GetTableStructor()]
export default class DbContext {
  databaseName: string = "mydatabase.db";
  database: IDatabase<TableNames>;
  constructor() {
    this.database = createDbContext<TableNames>(tables, async () => SQLite.openDatabase(this.databaseName));
  }
}
```

### More advanced setup dbContexts with refresher
```ts
export default class DbContext {
  databaseName: string = "mydatabase.db";
  database: IDatabase<TableNames>;
  constructor() {
 this.database = createDbContext<TableNames>(tables, async () => {
      return SQLite.openDatabase(this.databaseName)
    }, async (db) => {
      try {
        for (let sql of `
      PRAGMA cache_size=8192;
      PRAGMA encoding="UTF-8";
      PRAGMA synchronous=NORMAL;
      PRAGMA temp_store=FILE;
      `.split(";").filter(x=> x.length>2).map(x => {
          return { sql: x, args: [] }
        })) {
          await db.executeRawSql([sql], false);
        }
      } catch (e) {
        console.error(e);
      } finally {
        db.startRefresher(3600000);
      }
    }, !__DEV__);
  }
}
```


### Using the dbContexts
```js
const dbContext = new DbContext();
const App=()=> {

React.useEffect(()=> {
  // When the app start 
  const firstRun= async()=> {
  // this will create the database tables if it not already created
  await dbContext.database.setUpDataBase();
  
  }
  firstRun();
},[]);

const addItem= async ()=> {
  var item = await dbContext.database.save(new Parent("testName", "test@gmail.com"));
  var child = await dbContext.database.save(new Child("testName",item.id));
  // There is many different way to select
  // the basic way 
  // this will be converted to [SELECT * FROM PARENTS WHERE name = ?] WHERE ? is the arguments
   var item = await dbContext.database.where<Parent>("Parents", { name: "testName"})
  // and there is a much uniqe way, for IQuery read below to see what you methods it containe
   var item = await dbContext.database.query<Parent>("Parents")
   .Column(x=> x.name)
   .EqualTo("testName")
   .firstOrDefault();
   item.name= "test"
   item.saveChanges();
 
   // You could also load the children when using query
   // this will be converted to [Select * from Parents where (name in (?,?)) OR (email like %?%)] WHERE ? is the arguments.
   // Also make note that if arguments in IN() is empty or undefined the select Sats will remove the select for the column Name
   // and the select will be [Select * from Parents where (email like %?%)] the same for EqualTo etc..
   
    var item = await dbContext.database.query<Parent>("Parents")
     .Start().Column(x=> x.name).IN(["name", "testName"]).End()
     .OR()
     .Start().Column("email").Contains("test@").End()
     .LoadChildren("Childrens", x=> x.id)
     .With<Child>(x=> x.parentId)
     .AssignTo(x=> x.children).toList();
     
     
     // You could also use simple sql 
    var item=  (await dbContext.database.find("Select * from Parents where (name in (?,?)) OR (email like %?%)", ["name", "testName","test@" ])) as Parent[];
    
    // you could also watch the db operation very easy.
    useEffect(()=> {
     var watcher = dbContext.database.watch<Parent>("Parents");
     watcher.onSave = async (item, operation)=> {
       // operation = "INSERT" OR "UPDATE"
        console.log(item);
     }
     
     watcher.onDelete = async (item)=> {
        console.log(item);
     }
     
     return ()=> watcher.removeWatch();
    },[])
    
}
}
```

### IQuery
```js
interface IQuery<T, D extends string> {
    Column: <B>(item: ((x: T) => B) | keyof T) => IQuery<T, D>;
    EqualTo: (value: SingleValue) => IQuery<T, D>;
    Contains:  (value: StringValue) => IQuery<T, D>;
    StartWith:  (value: StringValue) => IQuery<T, D>;
    EndWith:  (value: StringValue) => IQuery<T, D>;
    NotEqualTo: (value: SingleValue) => IQuery<T, D>;
    EqualAndGreaterThen: <B>(value: NumberValue) => IQuery<T, D>;
    EqualAndLessThen: (value: NumberValue) => IQuery<T, D>;
    Start: () => IQuery<T, D>;
    End: () => IQuery<T, D>;
    OR: () => IQuery<T, D>;
    AND: () => IQuery<T, D>;
    GreaterThan: (value: NumberValue) => IQuery<T, D>;
    LessThan: (value: ((x: T) => B) | NumberValue) => IQuery<T, D>;
    IN: (value: ArrayValue) => IQuery<T, D>;
    NotIn: (value: ArrayValue) => IQuery<T, D>;
    Null: () => IQuery<T, D>;
    NotNull: () => IQuery<T, D>;
    OrderByDesc: <B>(item: ((x: T) => B) | string) => IQuery<T, D>;
    OrderByAsc: <B>(item: ((x: T) => B) | string) => IQuery<T, D>;
    Limit: (value: number) => IQuery<T, D>;

    // Load array
    LoadChildren: <B>(childTableName: D, parentProperty: ((x: T) => B)|string) => IChildQueryLoader<B, T, D>;
    // load object
    LoadChild: <B>(childTableName: D, parentProperty: ((x: T) => B)|string) => IChildQueryLoader<B, T, D>
    // Delete based on Query, this will create Delete from 
    delete: ()=> Promise<void>;
    // get the first item or undefined
    firstOrDefault: () => Promise<IQueryResultItem<T, D> | undefined>;
    // Try to find the Queried item if not found then insert item and return it from the database.
    findOrSave: (item: IBaseModule<D>) => Promise<IQueryResultItem<T, D>>;
    // return a list
    toList: () => Promise<IQueryResultItem<T, D>[]>;
    getQueryResult: () => IQuaryResult<D>;
}
```

### IDatabase
```js
export interface IDatabase<D extends string> {
    isClosed?: boolean,
    // Its importend that,createDbContext return new data database after this is triggered
    tryToClose: () => Promise<boolean>,
    close:()=> Prmoise<void>,
    // save and delete method begintransaction if beginTransaction not executed and there is more then one item
    beginTransaction:()=> Promise<void>;
    commitTransaction:()=> Promise<void>;
    rollbackTransaction:()=> Promise<void>;

    // Auto close the db after every ms.
    // The db will be able to refresh only if there is no db operation is ongoing.
    // This is useful, so that it will use less memory as SQlite tends to store transaction in memories which causes the increase in memory over time.
    // its best to use ms:3600000
    // the db has to be ideal for ms to be able to close it.
    startRefresher: (ms: number) => void;
    // the columns for the current table
    allowedKeys: (tableName: D) => Promise<string[]>;
    // convert object to IQueryResultItem
    asQueryable: <T>(item: IBaseModule<D>, tableName?: D) => Promise<IQueryResultItem<T, D>>
    // add a watcher for the selected table, this is a global watch. 
    // no matter which dbContext you use it will trigger when a change to the database item for the selected table is chaged
    watch: <T>(tableName: D) => IWatcher<T, D>;
    // start a Query
    query: <T>(tableName: D) => IQuery<T, D>;
    find: (query: string, args?: any[], tableName?: D) => Promise<IBaseModule<D>[]>
    // insert or update depends on Id or isUnique columns
    save: <T>(item?: IBaseModule<D> | (IBaseModule<D>[]), insertOnly?: Boolean, tableName?: D) => Promise<T[]>;
    where: <T>(tableName: D, query?: any | T) => Promise<T[]>;
    // delete an item, there is no check for contraint values, so make sure you do that befor you delete the item
    delete: (item: IBaseModule<D> | (IBaseModule<D>[]), tableName?: D) => Promise<void>;
    // execute a query
    execute: (query: string, args?: any[]) => Promise<boolean>;
    // drop all tables in the database
    dropTables: () => Promise<void>;
    // Check and create table if not exist. this only run once when the app start else set forceCheck= true to check again
    setUpDataBase: (forceCheck?: boolean) => Promise<void>;
    // check if the modules differ from the database table.
    // You will have to apply those changes your selef. You could make an ApplyChanges and get the values then drops all tables and 
    // recreated it using setUpDataBase(true) then insert it them again. 
    tableHasChanges: (item: TablaStructor<D>) => Promise<boolean>;
}
```
### obfuscator-io-metro-plugin
If you use obfuscator-io-metro-plugin and use IQuery expression eg `Column(x=> x.name)`
then you should have those settings below. as the obfuscator will rewite all properties and the library can not read those.

```js
const jsoMetroPlugin = require("obfuscator-io-metro-plugin")(
  {
    compact: false,
    sourceMap: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0, // Very Importend
    numbersToExpressions: true,
    simplify: true,
    shuffleStringArray: true,
    splitStrings: true,
    stringArrayThreshold: 0 // Very Importend
  },
  {
    runInDev: false /* optional */,
    logObfuscatedFiles: true /* optional generated files will be located at ./.jso */,
    sourceMapLocation:
      "./index.android.bundle.map" /* optional  only works if sourceMap: true in obfuscation option */,
  }
);

```

## Hermes
If you are using hermes and using expression ex `x=> x.id` then you will have too add `show source` on top of the files where you are using it.
Its best to gather all the queries in a one class and add `show source` on top of this specific class, eg repository and the db classes on the example above.


Otherwise if you still want to use more advanced obfuscator settings then you should use `Column("name")` 
instead of expression `x=> x.name` as the library could still read the string and count it as a column.

This Library is new and I am using it for my project and decided too put it on npm, so there may be some issues discovered later.
Please report those so I could make sure to fix them.

