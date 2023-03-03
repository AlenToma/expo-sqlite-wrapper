import 'should'
import mocha from 'mocha'
import { createQueryResultType, Query, jsonToSqlite, encrypt, decrypt } from '../SqlQueryBuilder';
import BulkSave from '../BulkSave';
import TableBuilder from '../TableStructor'
import crypto from 'crypto-js'
interface Test {
    name: string;
    id: number;
    password: string;
}

type TableName = "Test"

const database = {
    delete: async () => { },
    save: async () => { },
    tables: [TableBuilder<Test, TableName>("Test").column("id").number.primary.autoIncrement.column("name").column("password").encrypt("testEncryptions")]
} as any

const item = {
    name: "test 1",
    id: 1, 
    password: "test hahaha"
} as Test

mocha.describe("encryptions", function () {
    const en = encrypt("test", "123")
    const dec = decrypt(en, "123");
    dec.should.eql("test")
});

mocha.describe("readEncryption", function () {
    console.log("readEncryption")
    var q = new Query<Test, TableName>("Test", database);
    q.Column("password").EqualTo("test").AND().Column("name").EqualTo("hey").Limit(100).OrderByAsc("name").getQueryResult("SELECT").sql.trim().should.eql("SELECT * FROM Test  WHERE password = ? AND name = ? Limit 100 Order By name ASC")
    q.Column("password").EqualTo("test").AND().Column("name").EqualTo("hey").Limit(100).OrderByAsc("name").getQueryResult("SELECT").values[0].should.eql("#dbEncrypted&iwx3MskszSgNcP8QDQA7Ag==")
    q.Column("password").EqualTo("test").AND().Column("name").EqualTo("hey").Limit(100).OrderByAsc("name").getQueryResult("SELECT").values[1].should.eql("hey")
});



mocha.describe("JsonToSql", function () {

   const sql = jsonToSqlite({
        type: 'select',
        table: 'DetaliItems',
        condition:{"DetaliItems.id":{$gt: 1}, "DetaliItems.title": "Epic Of Caterpillar"},  
        join: {
            Chapters: {
                on: {'DetaliItems.id': 'Chapters.detaliItem_Id'} 
            }
        }
    })

    sql.sql.trim().should.eql("select * from DetaliItems join Chapters on DetaliItems.id = Chapters.detaliItem_Id where DetaliItems.id > 1 and DetaliItems.title = ?;")
});

mocha.describe("bulkSaveWithEncryptionsInsert", function () {
    console.log("bulkSaveWithEncryptionsInsert")
    const b = new BulkSave<Test, TableName>(database, ["name", "password"], "Test").insert(item as any);
    b.quries[0].args[1].should.eql("#dbEncrypted&R9e01Yx38fEBCU6PBNsWZQ==")
    b.quries[0].args[0].should.eql(item.name)
});

mocha.describe("bulkSaveWithEncryptionsUpdate", function () {
    console.log("bulkSaveWithEncryptionsUpdate");
    const b = new BulkSave<Test, TableName>(database, ["name", "password"], "Test").update(item as any);
    b.quries[0].args[1].should.eql("#dbEncrypted&R9e01Yx38fEBCU6PBNsWZQ==");
    b.quries[0].args[0].should.eql(item.name);
});


mocha.describe("DeleteWthLimit", function () {

    var q = new Query<Test, TableName>("Test", database);

    q.Limit(100).OrderByAsc("name").getQueryResult("DELETE").sql.trim().should.eql("DELETE FROM Test")
});


mocha.describe("DeleteWithSearch", function () {

    var q = new Query<Test, TableName>("Test", database);

    q.Start().Column("id").EqualTo(50).End().getQueryResult("DELETE").sql.trim().should.eql("DELETE FROM Test  WHERE ( id = ? )")
});

mocha.describe("DeleteWithSearchNotIn", function () {

    var q = new Query<Test, TableName>("Test", database);

    q.Start().Column("id").NotIn([10,2]).End().getQueryResult("DELETE").sql.trim().should.eql("DELETE FROM Test  WHERE ( id NOT IN ( ?,? ) )")
});


mocha.describe("LimitTest", function () {

    var q = new Query<Test, TableName>("Test", database);

    q.Limit(100).getQueryResult().sql.trim().should.eql("SELECT * FROM Test Limit 100")
});

mocha.describe("OrderDesc", function () {

    var q = new Query<Test, TableName>("Test", database);

    q.OrderByDesc("id").getQueryResult().sql.trim().should.eql("SELECT * FROM Test Order By id DESC")
});

mocha.describe("OrderAsc", function () {
    var q = new Query<Test, TableName>("Test", database);

    q.OrderByAsc("id").getQueryResult().sql.trim().should.eql("SELECT * FROM Test Order By id ASC")
});


mocha.describe("WhereColumn", function () {
    var q = new Query<Test, TableName>("Test", database);

    q.Column("name").Contains("test").OrderByDesc("id").getQueryResult().sql.trim().should.eql("SELECT * FROM Test  WHERE name like ? Order By id DESC")
});


mocha.describe("lessString", function () {
    var q = new Query<Test, TableName>("Test", database);

    q.Column("name").LessThan("15").getQueryResult().sql.trim().should.eql("SELECT * FROM Test  WHERE name < ?")
});