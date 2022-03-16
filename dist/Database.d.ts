import { IDatabase } from './expo.sql.wrapper.types';
import TablaStructor from './TableStructor';
import * as SQLite from 'expo-sqlite';
export default function <D extends string>(databaseTables: TablaStructor<any, D>[], getDatabase: () => Promise<SQLite.WebSQLDatabase>, onInit?: (database: IDatabase<D>) => Promise<void>): IDatabase<D>;
