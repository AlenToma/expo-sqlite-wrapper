# querySelector
With `querySelector` you could build your sql using expression.

That mean when you make changes to your objects and so on, You will notice those changes even in your sql queries.

## Example
```ts
const query= dbContext.database.querySelector<Parent>("Parents");

// you could load children
query.LoadChildren<Child>("Childrens", "parentId", "id", "children", true);

// Simple Where
query.Where.Column(x=> x.id).EqualTo(1);

// you could join, left join, crossjoin and innerJoin
query.Join<Child, "b">("Children", "b").Column(x=> x.a.id).EqualTo(x=> x.b.parentId).Where.Column(x=> x.b.name).Not.IN(["test", "test"]);

// You could Select
query.Join<Child, "b" >("Children", "b").Column(x=> x.a.id).EqualTo(x=> x.b.parentId).Where.Column(x=> x.b.name).Not.IN(["test", "test"]).Select.Columns((x, as) => [x.a.id, x.b.name, as(x.a.email, "user email")]);

// you could use sqlite aggrigatos like count, min, max and more
query.Join<Child, "b">("Children", "b").Column(x=> x.a.id).EqualTo(x=> x.b.parentId).Where.Column(x=> x.b.name).Not.IN(["test", "test"]).Select.Count(x=> x.a.id, "idCount").Count(x=> "*", "AllRows");

// you could also use having
query.Join<Child, "b">("Children", "b").Column(x=> x.a.id).EqualTo(x=> x.b.parentId).Where.Column(x=> x.b.name).Not.IN(["test", "test"]).Select.Count(x=> x.a.id, "idCount").Having.Column("idCount").GreaterThen(5);

// You could also cast or convert your data to different objects
const items = query.Join<Child, "b">("Children", "b").Column(x=> x.a.id).EqualTo(x=> x.b.parentId).Where.Column(x=> x.b.name).Not.IN(["test", "test"]).Select.Count(x=> x.a.id, "idCount").Having.Column("idCount").GreaterThen(5).Cast<MyJoinObject>().toList();
// or to convert
const item = query.Join<Child, "b">("Children", "b").Column(x=> x.a.id).EqualTo(x=> x.b.parentId).Where.Column(x=> x.b.name).Not.IN(["test", "test"]).Select.Count(x=> x.a.id, "idCount").Having.Column("idCount").GreaterThen(5).Cast<MyJoinObject>(x=> new MyJoinObject(x)).toList();

// You could also use inner select this will be converted to `select * from Parents where id in (select parentId from Childrens)`
query.Where.Column(x=> x.id).IN(dbContext.database.querySelector<Child>("Childrens").Select.Columns(x=> [x.parentId]))

// Loading the data tolist, delete, firstOrDefault...
const items= await query.toList();

// There is way more you could use.

```
