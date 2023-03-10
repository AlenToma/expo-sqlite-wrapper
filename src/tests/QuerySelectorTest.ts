import 'should'
import mocha from 'mocha'
import { createQueryResultType, Functions } from '../UsefullMethods'
import BulkSave from '../BulkSave';
import TableBuilder from '../TableStructor'
import QuerySelector, { IQuerySelector } from '../QuerySelector';
import '../extension'
interface TestA {
    name: string;
    id: number;
    password: string;
    children: TestB[]
}

interface TestB {
    fullName: string;
    name: string;
    id: number;
    alies: string;
    parentId?: number;
}


type TableNames = 'TestA' | 'TestB';

const database = {
    delete: async () => { },
    save: async () => { },
    tables: [
        TableBuilder<TestA, TableNames>("TestA").column("id").number.primary.autoIncrement.column("name").column("password").encrypt("testEncryptions"),
        TableBuilder<TestB, TableNames>("TestB").column("id").number.primary.autoIncrement.column("name").column("fullName").column("name").column("alies").column("parentId").number.nullable
    ]
} as any

const item = {
    name: "test 1",
    id: 1,
    password: "test hahaha"
} as TestA

mocha.describe("testWhere", function () {
    console.log("testWhere")
    const q = Functions.translateSimpleSql(database, "TestA", { "$in-password": ["test", "hahaha"], name: "hey" })
    const q2 = Functions.translateSimpleSql(database, "TestA", { password: "test", name: "hey" })
    const q3 = Functions.translateSimpleSql(database, "TestA");
    q.sql.should.eql("SELECT * FROM TestA WHERE password IN (?, ?) AND name=? ");
    q.args[0].should.eql("#dbEncrypted&iwx3MskszSgNcP8QDQA7Ag==");
    q.args[2].should.eql("hey")
    q2.sql.should.eql("SELECT * FROM TestA WHERE password=? AND name=? ");
    q2.args[0].should.eql("#dbEncrypted&iwx3MskszSgNcP8QDQA7Ag==");
    q2.args[1].should.eql("hey");
    q3.sql.should.eql("SELECT * FROM TestA ");
});


mocha.describe("testgetAvailableKeys", function () {
    const items = Functions.getAvailableKeys(["name", "id", "password"], {
        password: "test"
    })

    items.length.should.eql(1);
});

mocha.describe("encryptions", function () {
    const en = Functions.encrypt("test", "123")
    const dec = Functions.decrypt(en, "123");
    dec.should.eql("test")
});

mocha.describe("readEncryption", function () {
    console.log("readEncryption")
    var q = new QuerySelector<TestA, TableNames>("TestA", database) as IQuerySelector<TestA, TableNames>;
    const sql = q.Where.Column(x => x.password).EqualTo("test").AND.Column(x => x.name).EqualTo("hey").Limit(100).OrderByAsc(x => x.name).getSql("SELECT")
    sql.sql.trim().should.eql("SELECT * FROM TestA WHERE password = ? AND name = ? ORDER BY name ASC Limit 100")
    sql.args[0].should.eql("#dbEncrypted&iwx3MskszSgNcP8QDQA7Ag==")
    sql.args[1].should.eql("hey")
    sql.args.length.should.eql(2)
});

mocha.describe("startWith", function () {
    console.log("startWith")
    var q = new QuerySelector<TestA, TableNames>("TestA", database) as IQuerySelector<TestA, TableNames>;
    const sql = q.Where.Column(x => x.password).EqualTo("test").AND.Column(x => x.name)
        .EqualTo("hey").AND
        .Column(x => x.name)
        .Not.StartsWith(x => x.password)
        .Start.Column(x => x.name).EndsWith("he").End
        .Limit(100).OrderByAsc(x => x.name).getSql("SELECT")
    sql.sql.trim().should.eql("SELECT * FROM TestA WHERE password = ? AND name = ? AND name NOT like password + \'%\' ( name like ? ) ORDER BY name ASC Limit 100")
    sql.args[0].should.eql("#dbEncrypted&iwx3MskszSgNcP8QDQA7Ag==")
    sql.args[1].should.eql("hey")
    sql.args[2].should.eql("%he")
    sql.args.length.should.eql(3)
});



mocha.describe("JsonToSql", function () {

    const sql = Functions.jsonToSqlite({
        type: 'select',
        table: 'DetaliItems',
        condition: { "DetaliItems.id": { $gt: 1 }, "DetaliItems.title": "Epic Of Caterpillar" },
        join: {
            Chapters: {
                on: { 'DetaliItems.id': 'Chapters.detaliItem_Id' }
            }
        }
    })

    sql.sql.trim().should.eql("select * from DetaliItems join Chapters on DetaliItems.id = Chapters.detaliItem_Id where DetaliItems.id > 1 and DetaliItems.title = ?;")
});

mocha.describe("bulkSaveWithEncryptionsInsert", function () {
    console.log("bulkSaveWithEncryptionsInsert")
    const b = new BulkSave<TestA, TableNames>(database, ["name", "password"], "TestA").insert(item as any);
    b.quries[0].args[1].should.eql("#dbEncrypted&R9e01Yx38fEBCU6PBNsWZQ==")
    b.quries[0].args[0].should.eql(item.name)
});

mocha.describe("bulkSaveWithEncryptionsUpdate", function () {
    console.log("bulkSaveWithEncryptionsUpdate");
    const b = new BulkSave<TestA, TableNames>(database, ["name", "password"], "TestA").update(item as any);
    b.quries[0].args[1].should.eql("#dbEncrypted&R9e01Yx38fEBCU6PBNsWZQ==");
    b.quries[0].args[0].should.eql(item.name);
});

mocha.describe("DeleteWthLimit", function () {
    console.log("DeleteWthLimit");
    var q = new QuerySelector<TestA, TableNames>("TestA", database) as any as IQuerySelector<TestA, TableNames>;
    const sql = q.Limit(100).OrderByAsc(x => x.name).getSql("DELETE")
    sql.sql.trim().should.eql("DELETE FROM TestA")
    sql.args.length.should.eql(0)
});


mocha.describe("DeleteWithSearch", function () {
    console.log("DeleteWithSearch");
    var q = new QuerySelector<TestA, TableNames>("TestA", database) as any as IQuerySelector<TestA, TableNames>;
    const sql = (q.Where.Start.Column(x => x.id).EqualTo(50).End.getSql("DELETE"))
    sql.sql.trim().should.eql("DELETE FROM TestA WHERE ( id = ? )")
    sql.args[0].should.eql(50)
    sql.args.length.should.eql(1)
});

mocha.describe("DeleteWithSearchNotIn", function () {
    console.log("DeleteWithSearchNotIn");
    var q = new QuerySelector<TestA, TableNames>("TestA", database) as any as IQuerySelector<TestA, TableNames>;
    const sql = (q.Where.Start.Column(x => x.id).Not.IN([10, 2]).End.getSql("DELETE"))
    sql.sql.trim().should.eql("DELETE FROM TestA WHERE ( id NOT IN( ?, ? ) )")
    sql.args[0].should.eql(10)
    sql.args[1].should.eql(2)
    sql.args.length.should.eql(2)
});


mocha.describe("LimitTest", function () {
    console.log("LimitTest");
    var q = new QuerySelector<TestA, TableNames>("TestA", database) as any as IQuerySelector<TestA, TableNames>;
    const sql = (q.Limit(100).getSql("SELECT"));
    sql.sql.trim().should.eql("SELECT * FROM TestA Limit 100")
    sql.args.length.should.eql(0)
});

mocha.describe("OrderDesc", function () {
    console.log("OrderDesc");
    var q = new QuerySelector<TestA, TableNames>("TestA", database) as any as IQuerySelector<TestA, TableNames>;
    const sql = (q.OrderByDesc(x => x.id).getSql("SELECT"))
    sql.sql.trim().should.eql("SELECT * FROM TestA ORDER BY id DESC");
    sql.args.length.should.eql(0)
});

mocha.describe("OrderAsc", function () {
    console.log("OrderAsc");
    var q = new QuerySelector<TestA, TableNames>("TestA", database) as any as IQuerySelector<TestA, TableNames>;
    const sql = q.OrderByAsc(x => x.id).getSql("SELECT")
    sql.sql.trim().should.eql("SELECT * FROM TestA ORDER BY id ASC")
    sql.args.length.should.eql(0)
});


mocha.describe("WhereColumn", function () {
    console.log("WhereColumn");
    var q = new QuerySelector<TestA, TableNames>("TestA", database) as any as IQuerySelector<TestA, TableNames>;
    const sql = (q.Where.Column(x => x.name).Contains("test").OrderByDesc(x => x.id).getSql("SELECT"))
    sql.sql.trim().should.eql("SELECT * FROM TestA WHERE name like ? ORDER BY id DESC")
    sql.args.length.should.eql(1)
    sql.args[0].should.eql("%test%")
});


mocha.describe("lessString", function () {
    console.log("lessString");
    var q = new QuerySelector<TestA, TableNames>("TestA", database) as any as IQuerySelector<TestA, TableNames>;
    const sql = q.Where.Column(x => x.id).LessThan(15).getSql("SELECT");
    sql.sql.trim().should.eql("SELECT * FROM TestA WHERE id < ?")
    sql.args[0].should.eql(15)
    sql.args.length.should.eql(1)
});

mocha.describe("innerjoin", function () {
    console.log("innerjoin");
    var q = new QuerySelector<TestA, TableNames>("TestA", database) as any as IQuerySelector<TestA, TableNames>;
    const sql = q.InnerJoin<TestB, "b">("TestB", "b").Column(x => x.a.id).EqualTo(x => x.b.parentId).Where.Column(x => x.a.id).LessThan(15).getSql("SELECT");
    sql.sql.trim().should.eql("SELECT * FROM TestA as a INNER JOIN TestB as b ON  a.id = b.parentId WHERE a.id < ?")
    sql.args[0].should.eql(15)
    sql.args.length.should.eql(1)
});

mocha.describe("leftjoin", function () {
    console.log("leftjoin");
    var q = new QuerySelector<TestA, TableNames>("TestA", database) as any as IQuerySelector<TestA, TableNames>;
    const sql = q.LeftJoin<TestB, "b">("TestB", "b").Column(x => x.a.id).EqualTo(x => x.b.parentId).Where.Column(x => x.a.id).LessThan(15).getSql("SELECT");
    sql.sql.trim().should.eql("SELECT * FROM TestA as a LEFT JOIN TestB as b ON  a.id = b.parentId WHERE a.id < ?")
    sql.args[0].should.eql(15)
    sql.args.length.should.eql(1)
});

mocha.describe("RIGHTjOIN", function () {
    console.log("RIGHTjOIN");
    var q = new QuerySelector<TestA, TableNames>("TestA", database) as any as IQuerySelector<TestA, TableNames>;
    const sql = q.RightJoin<TestB, "b">("TestB", "b").Column(x => x.a.id).EqualTo(x => x.b.parentId).Where.Column(x => x.a.id).LessThan(15).getSql("SELECT");
    sql.sql.trim().should.eql("SELECT * FROM TestA as a RIGHT JOIN TestB as b ON  a.id = b.parentId WHERE a.id < ?")
    sql.args[0].should.eql(15)
    sql.args.length.should.eql(1)
});

mocha.describe("HAVING", function () {
    console.log("HAVING");
    var q = new QuerySelector<TestA, TableNames>("TestA", database) as any as IQuerySelector<TestA, TableNames>;
    const sql = q.RightJoin<TestB, "b">("TestB", "b")
        .Column(x => x.a.id)
        .EqualTo(x => x.b.parentId)
        .Where
        .Column(x => x.a.id)
        .LessThan(15)
        .Select.Columns((x, as) => [as(x.a.name, "setoNaming")])
        .Count(x => x.b.name, "sName")
        .Having
        .GroupBy(x => x.a.id).Column("sName")
        .GreaterThan(4).OrderByAsc(x => x.a.name).OrderByDesc(x => [x.a.id, x.b.fullName])
        .getSql("SELECT");
    sql.sql.trim().should.eql("SELECT a.name as setoNaming , count(b.name) as sName FROM TestA as a RIGHT JOIN TestB as b ON  a.id = b.parentId WHERE a.id < ? GROUP BY a.id HAVING sName > ? ORDER BY a.name ASC, a.id DESC, b.fullName DESC")
    sql.args[0].should.eql(15)
    sql.args[1].should.eql(4)
    sql.args.length.should.eql(2)
});

mocha.describe("SimpleSql", function () {
    console.log("SimpleSql");
    var q = new QuerySelector<TestA, TableNames>("TestA", database) as any as IQuerySelector<TestA, TableNames>;
    const sql = q.RightJoin<TestB, "b">("TestB", "b")
        .Column(x => x.a.id)
        .EqualTo(x => x.b.parentId)
        .Where
        .Column(x => x.a.id)
        .LessThan(15).AND.Column(x => x.a.name).Not.StartsWith("?")
        .Select.Columns((x, as) => [as(x.a.name, "setoNaming")])
        .Count(x => x.b.name, "sName")
        .Having
        .GroupBy(x => x.a.id).Column("sName")
        .GreaterThan(4).OrderByAsc(x => x.a.name).OrderByDesc(x => [x.a.id, x.b.fullName])
        .getInnerSelectSql()
    sql.trim().should.eql("SELECT a.name as setoNaming , count(b.name) as sName FROM TestA as a RIGHT JOIN TestB as b ON  a.id = b.parentId WHERE a.id < 15 AND a.name NOT like \'?%\' GROUP BY a.id HAVING sName > 4 ORDER BY a.name ASC, a.id DESC, b.fullName DESC")

});

mocha.describe("InnerSelect", function () {
    console.log("InnerSelect");
    var q = new QuerySelector<TestA, TableNames>("TestA", database) as any as IQuerySelector<TestA, TableNames>;
    var q2 = new QuerySelector<TestA, TableNames>("TestA", database) as any as IQuerySelector<TestA, TableNames>;
    const sql = q.RightJoin<TestB, "b">("TestB", "b")
        .Column(x => x.a.id)
        .EqualTo(x => x.b.parentId)
        .Where
        .Column(x => x.a.id)
        .LessThan(15).AND.Column(x => x.a.name).Not.StartsWith("?").AND.Column(x => x.a.password).Not.IN(q2.Where.Column(x => x.id).GreaterThan(1).Select.Columns(x => [x.password]))
        .Select.Columns((x, as) => [as(x.a.name, "setoNaming")])
        .Count(x => x.b.name, "sName")
        .Having
        .GroupBy(x => x.a.id).Column("sName")
        .GreaterThan(4).OrderByAsc(x => x.a.name).OrderByDesc(x => [x.a.id, x.b.fullName])
        .getInnerSelectSql()
    sql.trim().should.eql("SELECT a.name as setoNaming , count(b.name) as sName FROM TestA as a RIGHT JOIN TestB as b ON  a.id = b.parentId WHERE a.id < 15 AND a.name NOT like \'?%\' AND a.password NOT IN( (SELECT password FROM TestA WHERE id > 1) ) GROUP BY a.id HAVING sName > 4 ORDER BY a.name ASC, a.id DESC, b.fullName DESC")
});

mocha.describe("ValueAndBetWeen", function () {
    console.log("ValueAndBetWeen");
    var q = new QuerySelector<TestA, TableNames>("TestA", database) as any as IQuerySelector<TestA, TableNames>;
    var q2 = new QuerySelector<TestA, TableNames>("TestA", database) as any as IQuerySelector<TestA, TableNames>;
    const sql = q.RightJoin<TestB, "b">("TestB", "b")
        .Column(x => x.a.id)
        .EqualTo(x => x.b.parentId)
        .Where
        .Column(x => x.a.id)
        .LessThan(15).AND.Column(x => x.a.name).Not.StartsWith("?").AND.Column(x => x.a.password).Not.IN(q2.Where.Column(x => x.id).GreaterThan(1).Select.Columns(x => [x.password]))
        .Select.Columns((x, as) => [as(x.a.name, "setoNaming")])
        .Count(x => x.b.name, "sName")
        .Having
        .GroupBy(x => x.a.id).Column("sName")
        .GreaterThan(4).AND.Column(x => x.a.id).Between(2, 5).OrderByAsc(x => x.a.name).OrderByDesc(x => [x.a.id, x.b.fullName])
        .getInnerSelectSql()
    sql.trim().should.eql("SELECT a.name as setoNaming , count(b.name) as sName FROM TestA as a RIGHT JOIN TestB as b ON  a.id = b.parentId WHERE a.id < 15 AND a.name NOT like \'?%\' AND a.password NOT IN( (SELECT password FROM TestA WHERE id > 1) ) GROUP BY a.id HAVING sName > 4 AND a.id BETWEEN 2 AND 5 ORDER BY a.name ASC, a.id DESC, b.fullName DESC")
});


mocha.describe("Aggrigators", function () {
    console.log("Aggrigators");
    var q = new QuerySelector<TestA, TableNames>("TestA", database) as any as IQuerySelector<TestA, TableNames>;
    var q2 = new QuerySelector<TestA, TableNames>("TestA", database) as any as IQuerySelector<TestA, TableNames>;
    const sql = q.RightJoin<TestB, "b">("TestB", "b")
        .Column(x => x.a.id)
        .EqualTo(x => x.b.parentId)
        .Where
        .Column(x => x.a.id)
        .LessThan(15).AND.Start.Concat("||", x => x.a.name, "-", x => x.a.id).End.EndsWith("1").AND.Column(x => x.a.name).Not.StartsWith("?").AND.Column(x => x.a.password).Not.IN(q2.Where.Column(x => x.id).GreaterThan(1).Select.Columns(x => [x.password]))
        .Select.Columns((x, as) => [as(x.a.name, "setoNaming")])
        .Count(x => "*", "sName").Sum(x => x.a.id, "s").Concat("NameAndId", "||", x => x.a.name, "-", x => x.a.id)
        .Having
        .GroupBy(x => x.a.id).Column("sName")
        .GreaterThan(4).AND.Column(x => x.a.id).Between(2, 5).OrderByAsc(x => x.a.name).OrderByDesc(x => [x.a.id, x.b.fullName])
        .getInnerSelectSql()
    sql.trim().should.eql("SELECT a.name as setoNaming , count(*) as sName , sum(a.id) as s , a.name || \'-\' || a.id as NameAndId FROM TestA as a RIGHT JOIN TestB as b ON  a.id = b.parentId WHERE a.id < 15 AND ( a.name || \'-\' || a.id ) like \'%1\' AND a.name NOT like \'?%\' AND a.password NOT IN( (SELECT password FROM TestA WHERE id > 1) ) GROUP BY a.id HAVING sName > 4 AND a.id BETWEEN 2 AND 5 ORDER BY a.name ASC, a.id DESC, b.fullName DESC")
});