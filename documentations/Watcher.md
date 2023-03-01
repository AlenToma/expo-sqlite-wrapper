# Watcher
You could very easily watch all db operations like `insert, delete and update`.

```ts
const dbContext = new DbContext();
const App =()=> {
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

```
