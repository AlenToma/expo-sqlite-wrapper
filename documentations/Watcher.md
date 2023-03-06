# Watcher
You could very easily watch all db operations like `insert, delete and update`.

```ts
const dbContext = new DbContext();
const App =()=> {
  useEffect(()=> {
     var watcher = dbContext.database.watch<Parent>("Parents");
     watcher.onSave = async (items, operation)=> {
       // operation = "INSERT" OR "UPDATE"
        console.log(items);
     }
     
     watcher.onDelete = async (items)=> {
        console.log(items);
     }

     watcher.onBulkSave = async ()=> {
        console.log("item in the db has changed");
     }
     
     return ()=> watcher.removeWatch(); 
  },[])

}

```
