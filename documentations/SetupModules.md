# Modules Setup
The first step is to create and configure your modules.

For this example, we will create tow `classes` `Parent` and `Child`

```ts
import  { IBaseModule, TableBuilder, ColumnType, IQueryResultItem } from 'expo-sqlite-wrapper'

// We created `TableNames` so that it will be simpler when you are working in typescript
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
  
  // This method will return the table setup that we will be using later on in `repository`
  static GetTableStructor() {
    return TableBuilder<Parent, TableNames>("Parents").
    column("id").primary.autoIncrement.number.
    column("name").
    //unique acts as an Id too as the library will chack if there exist an item with the same field value and will update instead.
    column("email").unique;
  }
}

```

And then we have `Child`

```ts
export class Child extends IBaseModule<TableNames>{
 someField: string;
 parentId?: number;
 constructor(someField:string, parentId?: number ){
   super("Childrens");
   this.someField = someField;
   this.parentId = parentId;
 }
  
  static GetTableStructor() {
    return TableBuilder<Child, TableNames>("Childrens").
    column("id").primary.autoIncrement.number.
    column("someField").
    column("parentId").number.nullable.
    constrain<Parent>("parentId", "Parents", "id").
    onItemCreate(x=> {
           var child= new Child(item.someField, item.parentId);
           child.id= item.id;
           return child;
    });
  }
}
```

With this we are done with our modules.

`TableBuilder` is usefull to setup your table. the methods available is as follow.


## Properties

`boolean` the column is of boolean type.

`number` the column is of integer type.

`decimal` the column is of decimal type.

`datetime` the column is of datetime type.

`string` the column is of string type.

`nullable` the column is nullable.

`primary` the column is primarykey.

`autoIncrement` the column autoIncrement.

`unique` the column act as and id, this is only apply when you are using the library `save` to insert or update your items.

`encrypt(encryptionKey)` incrypt the data in the column, this is only applied for string types.

`onItemCreate(func)` the data gets returned as json from the db, you could use this prop to convert it to a `class`

`column(columnKey)` add column to the table and specify it props there after.

`constrain` Specify a foreign key for the table
