import 'should'
import mocha from 'mocha'
import { createQueryResultType, Query } from '../SqlQueryBuilder';
interface Test {
    name: string;
    id: number;
}

type TableName = "Test"

const database = {
    delete: async () => { },
    save: async () => { }
} as any

const item = {
    name: "test 1",
    id: 1
} as Test

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

    q.Start().Column("id").NotIn(10,2).End().getQueryResult("DELETE").sql.trim().should.eql("DELETE FROM Test  WHERE ( id NOT IN ( ?,? ) )")
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