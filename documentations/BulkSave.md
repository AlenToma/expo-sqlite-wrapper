# BulkSave
When saving many data, it is best to skip some operation that `save` operation do.

That is why there is a simple way `expo-sqlite-wrapper` present (`BulkSave`)

## example

```ts
const dbContext = new DbContext();
const itemsToAdd =[...]
const itemToUpdate = [....]
const itemToRemove = [...]
const bulkSave = await dbContext.database.bulkSave<Parent>("Parents");
itemsToAdd.forEach(x=> bulkSave.insert(x));
itemToUpdate.forEach(x=> bulkSave.update(x));
itemToUpdate.forEach(x=> itemToRemove.delete(x));
// execute will send all the queries to the database
await itemToUpdate.execute();

```
