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

mocha.describe("LimitTest", function () {

    var q = new Query<Test, TableName>("Test", database);

    q.Limit(100).getQueryResult().sql.trim().should.eql("SELECT * FROM Test Limit 100")
});

mocha.describe("OrderDesc", function () {

    var q = new Query<Test, TableName>("Test", database);

    q.OrderByDesc(x=> x.id).getQueryResult().sql.trim().should.eql("SELECT * FROM Test Order By id DESC")
});

mocha.describe("OrderAsc", function () {
    var q = new Query<Test, TableName>("Test", database);

    q.OrderByAsc(x=> x.id).getQueryResult().sql.trim().should.eql("SELECT * FROM Test Order By id ASC")
});


mocha.describe("WhereColumn", function () {
    var q = new Query<Test, TableName>("Test", database);

    q.Column(x=> x.name).Contains("test").OrderByDesc(x=> x.id).getQueryResult().sql.trim().should.eql("SELECT * FROM Test  WHERE name like ? Order By id DESC")
});


mocha.describe("lessString", function () {
    var q = new Query<Test, TableName>("Test", database);

    q.Column(x=> x.name).LessThan("15").getQueryResult().sql.trim().should.eql("SELECT * FROM Test  WHERE name < ?")
});