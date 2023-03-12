# Using the dbContexts

The first thing you will have to do is make sure that you setup your tables.
for that you run `setUpDataBase` at the app startup

```ts
const dbContext = new DbContext();
const App =()=> {
  useEffct(()=> {
    (async()=>{
      await dbContext.database.setUpDataBase();
    })();
   },[])
}

```

Using the dbcontext to create/update and select data could not be more simpler.

```ts
// depending on item `id` and `unique` column `save` will update or insert the item
var item = await dbContext.database.save(new Parent("testName", "test@gmail.com"));
var child = await dbContext.database.save(new Child("testName",item.id));
```

For selecting the data you have more then one method to do that.
You can use the normal way for which `expo.sqlite`
`find` will return a simple json array.
```ts
  var items=  (await dbContext.database.find("Select * from Parents where (name in (?,?)) OR (email like %?%)", ["name", "testName","test@" ])) as Parent[];
```

There is also another way for which you can use `querySelector` builder

See [querySelector](https://github.com/AlenToma/expo-sqlite-wrapper/blob/main/documentations/querySelector.md) for more info
```ts
   var item = await dbContext.database.querySelector<Parent>("Parents").Where
   .Column(x=> x.name)
   .EqualTo("testName")
   .firstOrDefault();
   item.name= "test"
   await item.saveChanges();
```

You could also use `querySelector` builder to load children.

```ts
      var item = await dbContext.database.querySelector<Parent>("Parents").LoadChildren<Child>("Childrens", "parentId", "id", "children", true).Where
     .Start.Column(x=> x.name).IN(["name", "testName"]).End
     .OR
     .Start.Column(x=> x.email).Contains("test@").End
     .toList();
```

You could also use `querySelector` to delete items
```ts
      await dbContext.database.query<Parent>("Parents")
     .Start.Column(x=> x.name).IN(["name", "testName"]).End
     .OR
     .Start.Column(x=> x.email).Contains("test@").End.delete();
```

