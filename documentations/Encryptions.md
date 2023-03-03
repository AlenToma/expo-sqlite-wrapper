# Encryptions
You could encrypt data that are send to the db by specifying those to `TableBuilder`

See below

```ts
import  { IBaseModule, TableBuilder, ColumnType, IQueryResultItem } from 'expo-sqlite-wrapper'
class User extends IBaseModule<TableNames>{
    name: string;
    password: string;
    constructor(){
      super("Users")
      this.name = "test";
      this.password= "secret";
    }
    
  static GetTableStructor() {
    return TableBuilder<User, TableNames>("Users").
    column("id").primary.autoIncrement.number.
    column("name").
    column("password").encrypt("myscret key").
    objectPrototype(User.prototype)
  }
}

```
`Save` method will make sure to `encrypt` the above column before inserting and updating the database.
`find` method will make sure to `decrypt` the data before retuning the data to the user.

## Searching
To be able to search those column, you have tow diffrent ways. 
1- using IQuery to seach as it will make sure to encrypt your seach when it is send to the database
2- manually encrypt your seach and compaire it.
### example 1
```ts
  // 123 will be encrypted so it could be compaire to the value in the database
  var item = await dbContext.database.query<User>("Users").column("password").EqualTo("123").toList();

```

### example 2
```ts
  import  { encrypt, decrypt } from 'expo-sqlite-wrapper'
  // manually encrypt the value and send it to the database
  var items = await dbContext.database.find("select * from Users where password = ?", [encrypt("123", "myscret key")], "Users");
```