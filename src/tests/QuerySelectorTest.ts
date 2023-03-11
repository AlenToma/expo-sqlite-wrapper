import 'should'
import mocha from 'mocha'
import { createQueryResultType, Functions } from '../UsefullMethods'
import BulkSave from '../BulkSave';
import TableBuilder from '../TableStructor'
import QuerySelector, { IQuerySelector } from '../QuerySelector';
import '../extension'
import { DetaliItems, Chapters, tables, TableNames } from './TestItems';


const database = {
    delete: async () => { },
    save: async () => { },
    querySelector: (tbName: TableNames) => new QuerySelector<any, TableNames>(tbName, database),
    tables: tables
} as any

const item = {
    id: 1,
    title: "this is a test",
    novel: "testNovel"
} as DetaliItems

mocha.describe("testWhere", function () {
    console.log("testWhere")
    const q = Functions.translateSimpleSql(database, "DetaliItems", { "$in-novel": ["test", "hahaha"], title: "hey" })
    const q2 = Functions.translateSimpleSql(database, "DetaliItems", { novel: "test", title: "hey" })
    const q3 = Functions.translateSimpleSql(database, "DetaliItems");
    q.sql.should.eql("SELECT * FROM DetaliItems WHERE novel IN (?, ?) AND title=? ");
    q.args[0].should.eql("#dbEncrypted&iwx3MskszSgNcP8QDQA7Ag==");
    q.args[2].should.eql("hey")
    q2.sql.should.eql("SELECT * FROM DetaliItems WHERE novel=? AND title=? ");
    q2.args[0].should.eql("#dbEncrypted&iwx3MskszSgNcP8QDQA7Ag==");
    q2.args[1].should.eql("hey");
    q3.sql.should.eql("SELECT * FROM DetaliItems ");
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
    var q = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as IQuerySelector<DetaliItems, TableNames>;
    const sql = q.Where.Column(x => x.novel).EqualTo("test").AND.Column(x => x.title).EqualTo("hey").Limit(100).OrderByAsc(x => x.title)
    sql.getSql("SELECT").sql.trim().should.eql("SELECT * FROM DetaliItems WHERE novel = ? AND title = ? ORDER BY title ASC Limit 100")
    sql.getSql("SELECT").args[0].should.eql("#dbEncrypted&iwx3MskszSgNcP8QDQA7Ag==")
    sql.getSql("SELECT").args[1].should.eql("hey")
    sql.getSql("SELECT").args.length.should.eql(2)
    console.log("readEncryption", sql.getInnerSelectSql())
});

mocha.describe("startWith", function () {
    console.log("startWith")
    var q = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as IQuerySelector<DetaliItems, TableNames>;
    q.Where.Column(x => x.novel).EqualTo("test").AND.Column(x => x.title)
        .EqualTo("hey").AND
        .Column(x => x.title)
        .Not.StartsWith(x => x.novel)
        .Start.Column(x => x.title).EndsWith("he").End
        .Limit(100).OrderByAsc(x => x.title);
    const sql = q.getSql("SELECT");
    sql.sql.trim().should.eql("SELECT * FROM DetaliItems WHERE novel = ? AND title = ? AND title NOT like novel + \'%\' ( title like ? ) ORDER BY title ASC Limit 100")
    sql.args[0].should.eql("#dbEncrypted&iwx3MskszSgNcP8QDQA7Ag==")
    sql.args[1].should.eql("hey")
    sql.args[2].should.eql("%he")
    sql.args.length.should.eql(3)
    console.log("startWith", q.getInnerSelectSql());

});



mocha.describe("JsonToSql", function () {
    console.log("JsonToSql")
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
    const b = new BulkSave<DetaliItems, TableNames>(database, ["title", "novel"], "DetaliItems").insert(item as any);
    b.quries[0].args[1].should.eql("#dbEncrypted&0eUCHRbFc8mdr94/KJYKOA==")
    b.quries[0].args[0].should.eql(item.title)
});

mocha.describe("bulkSaveWithEncryptionsUpdate", function () {
    console.log("bulkSaveWithEncryptionsUpdate");
    const b = new BulkSave<DetaliItems, TableNames>(database, ["title", "novel"], "DetaliItems").update(item as any);
    b.quries[0].args[1].should.eql("#dbEncrypted&0eUCHRbFc8mdr94/KJYKOA==");
    b.quries[0].args[0].should.eql(item.title);
});

mocha.describe("DeleteWthLimit", function () {
    console.log("DeleteWthLimit");
    var q = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    const sql = q.Limit(100).OrderByAsc(x => x.title).getSql("DELETE")
    sql.sql.trim().should.eql("DELETE FROM DetaliItems")
    sql.args.length.should.eql(0)
});


mocha.describe("DeleteWithSearch", function () {
    console.log("DeleteWithSearch");
    var q = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    const sql = (q.Where.Start.Column(x => x.id).EqualTo(50).End.getSql("DELETE"))
    sql.sql.trim().should.eql("DELETE FROM DetaliItems WHERE ( id = ? )")
    sql.args[0].should.eql(50)
    sql.args.length.should.eql(1)
});

mocha.describe("DeleteWithSearchNotIn", function () {
    console.log("DeleteWithSearchNotIn");
    var q = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    const sql = (q.Where.Start.Column(x => x.id).Not.IN([10, 2]).End.getSql("DELETE"))
    sql.sql.trim().should.eql("DELETE FROM DetaliItems WHERE ( id NOT IN( ?, ? ) )")
    sql.args[0].should.eql(10)
    sql.args[1].should.eql(2)
    sql.args.length.should.eql(2)
});


mocha.describe("LimitTest", function () {
    console.log("LimitTest");
    var q = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    const sql = (q.Limit(100).getSql("SELECT"));
    sql.sql.trim().should.eql("SELECT * FROM DetaliItems Limit 100")
    sql.args.length.should.eql(0)
});

mocha.describe("OrderDesc", function () {
    console.log("OrderDesc");
    var q = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    const sql = (q.OrderByDesc(x => x.id).getSql("SELECT"))
    sql.sql.trim().should.eql("SELECT * FROM DetaliItems ORDER BY id DESC");
    sql.args.length.should.eql(0)
});

mocha.describe("OrderAsc", function () {
    console.log("OrderAsc");
    var q = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    const sql = q.OrderByAsc(x => x.id).getSql("SELECT")
    sql.sql.trim().should.eql("SELECT * FROM DetaliItems ORDER BY id ASC")
    sql.args.length.should.eql(0)
});


mocha.describe("WhereColumn", function () {
    console.log("WhereColumn");
    var q = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    const sql = (q.Where.Column(x => x.title).Contains("test").OrderByDesc(x => x.id).getSql("SELECT"))
    sql.sql.trim().should.eql("SELECT * FROM DetaliItems WHERE title like ? ORDER BY id DESC")
    sql.args.length.should.eql(1)
    sql.args[0].should.eql("%test%")
});


mocha.describe("lessString", function () {
    console.log("lessString");
    var q = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    const sql = q.Where.Column(x => x.id).LessThan(15).getSql("SELECT");
    sql.sql.trim().should.eql("SELECT * FROM DetaliItems WHERE id < ?")
    sql.args[0].should.eql(15)
    sql.args.length.should.eql(1)
});

mocha.describe("innerjoin", function () {
    console.log("innerjoin");
    var q = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    q.InnerJoin<Chapters, "b">("Chapters", "b").Column(x => x.a.id).EqualTo(x => x.b.detaliItem_Id).Where.Column(x => x.a.id).LessThan(15)
    const sql = q.getSql("SELECT");
    sql.sql.trim().should.eql("SELECT * FROM DetaliItems as a INNER JOIN Chapters as b ON  a.id = b.detaliItem_Id WHERE a.id < ?")
    sql.args[0].should.eql(15)
    sql.args.length.should.eql(1)
    console.log("innerjoin", q.getInnerSelectSql())
});

mocha.describe("leftjoin", function () {
    console.log("leftjoin");
    var q = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    const sql = q.LeftJoin<Chapters, "b">("Chapters", "b").Column(x => x.a.id).EqualTo(x => x.b.detaliItem_Id).Where.Column(x => x.a.id).LessThan(15).getSql("SELECT");
    sql.sql.trim().should.eql("SELECT * FROM DetaliItems as a LEFT JOIN Chapters as b ON  a.id = b.detaliItem_Id WHERE a.id < ?")
    sql.args[0].should.eql(15)
    sql.args.length.should.eql(1)
    console.log("leftjoin", q.getInnerSelectSql())
});


mocha.describe("HAVING", function () {
    console.log("HAVING");
    var q = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    const sql = q.LeftJoin<Chapters, "b">("Chapters", "b")
        .Column(x => x.a.id)
        .EqualTo(x => x.b.detaliItem_Id)
        .Where
        .Column(x => x.a.id)
        .LessThan(15)
        .Select.Columns((x, as) => [as(x.a.title, "setoNaming")])
        .Count(x => x.b.chapterUrl, "sName")
        .Having
        .GroupBy(x => x.a.id).Column("sName")
        .GreaterThan(4).OrderByAsc(x => x.a.title).OrderByDesc(x => [x.a.id, x.b.chapterUrl])
        .getSql("SELECT");
    sql.sql.trim().should.eql("SELECT a.title as setoNaming , count(b.chapterUrl) as sName FROM DetaliItems as a LEFT JOIN Chapters as b ON  a.id = b.detaliItem_Id WHERE a.id < ? GROUP BY a.id HAVING sName > ? ORDER BY a.title ASC, a.id DESC, b.chapterUrl DESC")
    sql.args[0].should.eql(15)
    sql.args[1].should.eql(4)
    sql.args.length.should.eql(2)
    console.log("HAVING", q.getInnerSelectSql())
});

mocha.describe("SimpleSql", function () {
    console.log("SimpleSql");
    var q = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    const sql = q.LeftJoin<Chapters, "b">("Chapters", "b")
        .Column(x => x.a.id)
        .EqualTo(x => x.b.detaliItem_Id)
        .Where
        .Column(x => x.a.id)
        .LessThan(15).AND.Column(x => x.a.title).Not.StartsWith("?")
        .Select.Columns((x, as) => [as(x.a.title, "setoNaming")])
        .Count(x => x.b.chapterUrl, "sName")
        .Having
        .GroupBy(x => x.a.id).Column("sName")
        .GreaterThan(4).OrderByAsc(x => x.a.title).OrderByDesc(x => [x.a.id, x.b.chapterUrl])
        .getInnerSelectSql()
    sql.trim().should.eql("SELECT a.title as setoNaming , count(b.chapterUrl) as sName FROM DetaliItems as a LEFT JOIN Chapters as b ON  a.id = b.detaliItem_Id WHERE a.id < 15 AND a.title NOT like \'?%\' GROUP BY a.id HAVING sName > 4 ORDER BY a.title ASC, a.id DESC, b.chapterUrl DESC")
    console.log("SimpleSql", q.getInnerSelectSql())
});

mocha.describe("InnerSelect", function () {
    console.log("InnerSelect");
    var q = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    var q2 = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    const sql = q.LeftJoin<Chapters, "b">("Chapters", "b")
        .Column(x => x.a.id)
        .EqualTo(x => x.b.detaliItem_Id)
        .Where
        .Column(x => x.a.id)
        .LessThan(15).AND.Column(x => x.a.title).Not.StartsWith("?").AND.Column(x => x.a.novel).Not.IN(q2.Where.Column(x => x.id).GreaterThan(1).Select.Columns(x => [x.novel]))
        .Select.Columns((x, as) => [as(x.a.title, "setoNaming")])
        .Count(x => x.b.chapterUrl, "sName")
        .Having
        .GroupBy(x => x.a.id).Column("sName")
        .GreaterThan(4).OrderByAsc(x => x.a.title).OrderByDesc(x => [x.a.id, x.b.chapterUrl])
        .getInnerSelectSql()
    sql.trim().should.eql("SELECT a.title as setoNaming , count(b.chapterUrl) as sName FROM DetaliItems as a LEFT JOIN Chapters as b ON  a.id = b.detaliItem_Id WHERE a.id < 15 AND a.title NOT like \'?%\' AND a.novel NOT IN( (SELECT novel FROM DetaliItems WHERE id > 1) ) GROUP BY a.id HAVING sName > 4 ORDER BY a.title ASC, a.id DESC, b.chapterUrl DESC")
    console.log("InnerSelect", q.getInnerSelectSql())
});

mocha.describe("Join", function () {
    console.log("Join");
    var q = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    var q2 = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    const sql = q.Join<Chapters, "b">("Chapters", "b")
        .Column(x => x.a.id)
        .EqualTo(x => x.b.detaliItem_Id)
        .Where
        .Column(x => x.a.id)
        .LessThan(15).AND.Column(x => x.a.title).Not.StartsWith("?").AND.Column(x => x.a.novel).Not.IN(q2.Where.Column(x => x.id).GreaterThan(1).Select.Columns(x => [x.novel]))
        .Select.Columns((x, as) => [as(x.a.title, "setoNaming")])
        .Count(x => x.b.chapterUrl, "sName")
        .Having
        .GroupBy(x => x.a.id).Column("sName")
        .GreaterThan(4).OrderByAsc(x => x.a.title).OrderByDesc(x => [x.a.id, x.b.chapterUrl])
        .getInnerSelectSql()
    sql.trim().should.eql("SELECT a.title as setoNaming , count(b.chapterUrl) as sName FROM DetaliItems as a JOIN Chapters as b ON  a.id = b.detaliItem_Id WHERE a.id < 15 AND a.title NOT like \'?%\' AND a.novel NOT IN( (SELECT novel FROM DetaliItems WHERE id > 1) ) GROUP BY a.id HAVING sName > 4 ORDER BY a.title ASC, a.id DESC, b.chapterUrl DESC")
    console.log("Join", q.getInnerSelectSql())
});


mocha.describe("CrossJoin", function () {
    console.log("CrossJoin");
    var q = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    var q2 = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    const sql = q.CrossJoin<Chapters, "b">("Chapters", "b")
        .Column(x => x.a.id)
        .EqualTo(x => x.b.detaliItem_Id)
        .Where
        .Column(x => x.a.id)
        .LessThan(15).AND.Column(x => x.a.title).Not.StartsWith("?").AND.Column(x => x.a.novel).Not.IN(q2.Where.Column(x => x.id).GreaterThan(1).Select.Columns(x => [x.novel]))
        .Select.Columns((x, as) => [as(x.a.title, "setoNaming")])
        .Count(x => x.b.chapterUrl, "sName")
        .Having
        .GroupBy(x => x.a.id).Column("sName")
        .GreaterThan(4).OrderByAsc(x => x.a.title).OrderByDesc(x => [x.a.id, x.b.chapterUrl])
        .getInnerSelectSql()
    sql.trim().should.eql("SELECT a.title as setoNaming , count(b.chapterUrl) as sName FROM DetaliItems as a CROSS JOIN Chapters as b ON  a.id = b.detaliItem_Id WHERE a.id < 15 AND a.title NOT like \'?%\' AND a.novel NOT IN( (SELECT novel FROM DetaliItems WHERE id > 1) ) GROUP BY a.id HAVING sName > 4 ORDER BY a.title ASC, a.id DESC, b.chapterUrl DESC")
    console.log("CrossJoin", q.getInnerSelectSql())
});

mocha.describe("EmptyJoin", function () {
    console.log("EmptyJoin");
    var q = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    var q2 = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    const sql = q.Join<Chapters, "b">("Chapters", "b")
        .Where
        .Column(x => x.a.id)
        .LessThan(15).AND.Column(x => x.a.title).Not.StartsWith("?").AND.Column(x => x.a.novel).Not.IN(q2.Where.Column(x => x.id).GreaterThan(1).Select.Columns(x => [x.novel]))
        .Select.Columns((x, as) => [as(x.a.title, "setoNaming")])
        .Count(x => x.b.chapterUrl, "sName")
        .Having
        .GroupBy(x => x.a.id).Column("sName")
        .GreaterThan(4).OrderByAsc(x => x.a.title).OrderByDesc(x => [x.a.id, x.b.chapterUrl])
        .getInnerSelectSql()
    sql.trim().should.eql("SELECT a.title as setoNaming , count(b.chapterUrl) as sName FROM DetaliItems as a JOIN Chapters as b WHERE a.id < 15 AND a.title NOT like \'?%\' AND a.novel NOT IN( (SELECT novel FROM DetaliItems WHERE id > 1) ) GROUP BY a.id HAVING sName > 4 ORDER BY a.title ASC, a.id DESC, b.chapterUrl DESC")
    console.log("EmptyJoin", q.getInnerSelectSql())
});

mocha.describe("ValueAndBetWeen", function () {
    console.log("ValueAndBetWeen");
    var q = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    var q2 = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    const sql = q.LeftJoin<Chapters, "b">("Chapters", "b")
        .Column(x => x.a.id)
        .EqualTo(x => x.b.detaliItem_Id)
        .Where
        .Column(x => x.a.id)
        .LessThan(15).AND.Column(x => x.a.title).Not.StartsWith("?").AND.Column(x => x.a.novel).Not.IN(q2.Where.Column(x => x.id).GreaterThan(1).Select.Columns(x => [x.novel]))
        .Select.Columns((x, as) => [as(x.a.title, "setoNaming")])
        .Count(x => x.b.chapterUrl, "sName")
        .Having
        .GroupBy(x => x.a.id).Column("sName")
        .GreaterThan(4).AND.Column(x => x.a.id).Between(2, 5).OrderByAsc(x => x.a.title).OrderByDesc(x => [x.a.id, x.b.chapterUrl])
        .getInnerSelectSql()
    sql.trim().should.eql("SELECT a.title as setoNaming , count(b.chapterUrl) as sName FROM DetaliItems as a LEFT JOIN Chapters as b ON  a.id = b.detaliItem_Id WHERE a.id < 15 AND a.title NOT like \'?%\' AND a.novel NOT IN( (SELECT novel FROM DetaliItems WHERE id > 1) ) GROUP BY a.id HAVING sName > 4 AND a.id BETWEEN 2 AND 5 ORDER BY a.title ASC, a.id DESC, b.chapterUrl DESC")
    console.log("ValueAndBetWeen", q.getInnerSelectSql())
});


mocha.describe("Aggrigators", function () {
    console.log("Aggrigators");
    var q = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    var q2 = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    const sql = q.LeftJoin<Chapters, "b">("Chapters", "b")
        .Column(x => x.a.id)
        .EqualTo(x => x.b.detaliItem_Id)
        .Where
        .Column(x => x.a.id)
        .LessThan(15).AND.Start.Concat("||", x => x.a.title, "-", x => x.a.id).End.EndsWith("1").AND.Column(x => x.a.title).Not.StartsWith("?").AND.Column(x => x.a.novel).Not.IN(q2.Where.Column(x => x.id).GreaterThan(1).Select.Columns(x => [x.novel]))
        .Select.Columns((x, as) => [as(x.a.title, "setoNaming")])
        .Count(x => "*", "sName").Sum(x => x.a.id, "s").Concat("NameAndId", "||", x => x.a.title, "-", x => x.a.id)
        .Having
        .GroupBy(x => x.a.id).Column("sName")
        .GreaterThan(4).AND.Column(x => x.a.id).Between(2, 5).OrderByAsc(x => x.a.title).OrderByDesc(x => [x.a.id, x.b.chapterUrl])
        .getInnerSelectSql()
    sql.trim().should.eql("SELECT a.title as setoNaming , count(*) as sName , sum(a.id) as s , a.title || \'-\' || a.id as NameAndId FROM DetaliItems as a LEFT JOIN Chapters as b ON  a.id = b.detaliItem_Id WHERE a.id < 15 AND ( a.title || \'-\' || a.id ) like \'%1\' AND a.title NOT like \'?%\' AND a.novel NOT IN( (SELECT novel FROM DetaliItems WHERE id > 1) ) GROUP BY a.id HAVING sName > 4 AND a.id BETWEEN 2 AND 5 ORDER BY a.title ASC, a.id DESC, b.chapterUrl DESC")
    console.log("Aggrigators", q.getInnerSelectSql())
});


mocha.describe("Union", function () {
    console.log("Union");
    var q = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    var q2 = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    const sql = q.LeftJoin<Chapters, "b">("Chapters", "b")
        .Column(x => x.a.id)
        .EqualTo(x => x.b.detaliItem_Id)
        .Union(x => x.querySelector<Chapters>("Chapters").Where.Column(x => x.id).GreaterThan(1).AND.Column(x => x.chapterUrl).Not.StartsWith("t").Select.Columns(x => [x.chapterUrl]))
        .Where
        .Column(x => x.a.id)
        .LessThan(15).AND.Start.Concat("||", x => x.a.title, "-", x => x.a.id).End.EndsWith("1").AND.Column(x => x.a.title).Not.StartsWith("?").AND.Column(x => x.a.novel).Not.IN(q2.Where.Column(x => x.id).GreaterThan(1).Select.Columns(x => [x.novel]))
        .Select.Columns((x, as) => [as(x.a.title, "setoNaming")])
        .getInnerSelectSql()
    sql.trim().should.eql("SELECT a.title as setoNaming FROM DetaliItems as a LEFT JOIN Chapters as b ON  a.id = b.detaliItem_Id WHERE a.id < 15 AND ( a.title || \'-\' || a.id ) like \'%1\' AND a.title NOT like \'?%\' AND a.novel NOT IN( (SELECT novel FROM DetaliItems WHERE id > 1) ) UNION SELECT chapterUrl FROM Chapters WHERE id > 1 AND chapterUrl NOT like \'#dbEncrypted&JY+5fBsP75gn/K/VA1KFkQ==%\'")
    console.log("Union", q.getInnerSelectSql())
});

mocha.describe("UnionAll", function () {
    console.log("UnionAll");
    var q = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    var q2 = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    const sql = q.LeftJoin<Chapters, "b">("Chapters", "b")
        .Column(x => x.a.id)
        .EqualTo(x => x.b.detaliItem_Id)
        .UnionAll(x => x.querySelector<Chapters>("Chapters").Where.Column(x => x.id).GreaterThan(1).AND.Column(x => x.chapterUrl).Not.StartsWith("t").Select.Columns(x => [x.chapterUrl]))
        .Where
        .Column(x => x.a.id)
        .LessThan(15).AND.Start.Concat("||", x => x.a.title, "-", x => x.a.id).End.EndsWith("1").AND.Column(x => x.a.title).Not.StartsWith("?").AND.Column(x => x.a.novel).Not.IN(q2.Where.Column(x => x.id).GreaterThan(1).Select.Columns(x => [x.novel]))
        .Select.Columns((x, as) => [as(x.a.title, "setoNaming")])
        .getInnerSelectSql()
    sql.trim().should.eql("SELECT a.title as setoNaming FROM DetaliItems as a LEFT JOIN Chapters as b ON  a.id = b.detaliItem_Id WHERE a.id < 15 AND ( a.title || \'-\' || a.id ) like \'%1\' AND a.title NOT like \'?%\' AND a.novel NOT IN( (SELECT novel FROM DetaliItems WHERE id > 1) ) UNION ALL SELECT chapterUrl FROM Chapters WHERE id > 1 AND chapterUrl NOT like \'#dbEncrypted&JY+5fBsP75gn/K/VA1KFkQ==%\'")
    console.log("Union", q.getInnerSelectSql())
});

mocha.describe("Select case", function () {
    console.log("Select case");
    var q = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    var q2 = new QuerySelector<DetaliItems, TableNames>("DetaliItems", database) as any as IQuerySelector<DetaliItems, TableNames>;
    const sql = q.LeftJoin<Chapters, "b">("Chapters", "b")
        .Column(x => x.a.id)
        .EqualTo(x => x.b.detaliItem_Id)
        .Where.Case.When.Column(x=> x.a.id).EqualTo(2).Then.Value("hahaha").Else.Value("hohoho").EndCase.Not.IN(["hohoho"]).AND
        .Column(x => x.a.id)
        .LessThan(15).AND.Start.Concat("||", x => x.a.title, "-", x => x.a.id).End.EndsWith("1").AND.Column(x => x.a.title).Not.StartsWith("?").AND.Column(x => x.a.novel).Not.IN(q2.Where.Column(x => x.id).GreaterThan(1).Select.Columns(x => [x.novel]))
        .Select.Columns((x, as) => [as(x.a.title, "setoNaming")]).Case("test").When.Column(x=> x.a.id).EqualTo(2).Then.Value("hahaha").Else.Value("hohoho").EndCase
        .getInnerSelectSql()
    sql.trim().should.eql("SELECT a.title as setoNaming , (  CASE WHEN a.id = 2 THEN \'hahaha\' ELSE \'hohoho\' END ) as test FROM DetaliItems as a LEFT JOIN Chapters as b ON  a.id = b.detaliItem_Id WHERE CASE WHEN a.id = 2 THEN \'hahaha\' ELSE \'hohoho\' END NOT IN( \'hohoho\' ) AND a.id < 15 AND ( a.title || \'-\' || a.id ) like \'%1\' AND a.title NOT like \'?%\' AND a.novel NOT IN( (SELECT novel FROM DetaliItems WHERE id > 1) )")
    console.log("Select case", q.getInnerSelectSql())
});