# useQuery

`expo-sqlite-wrapper` have hooks that you could use in a components.

The hook is able to tracks changes done globally, so if you change an item in the database `useQuery` will be able to track the changes and render the component.

Here is how simple it is to use it.

```tsx
const Name =()=> {
 const [users, dataIsLoading] = 
  DbContext.database.useQuery("Users",
  DbContext.database.querySelector<User>("Users").Where.Column(x=> x.name).StartsWith("t"));

return (
    <>
    {
        users.map((x,i)=> <Text key={i}>{x.name}</Text>)
    }
    </>
)
}

```

## Properties useQuery

### tableName
The TableName

### query
Could be one of the folowing `(SqlLite.Query) | (IReturnMethods<T, D>) | (() => Promise<T[]>`

The initiated data.

### onDbItemChanged(Optional)

When Changes Happend to the database, `useQuery` have to request `query` from the db, and incase the data is big, you could use this instead to skip the request to the database.

eg `(items)=> items.filter(x=> x.name.startWith("t"))`

