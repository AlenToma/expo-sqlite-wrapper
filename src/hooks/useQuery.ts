import { IBaseModule, IDatabase, IDataBaseExtender, IId, IQuery, IQueryResultItem } from "../expo.sql.wrapper.types";
import { encrypt, isDate, oEncypt, getAvailableKeys, createQueryResultType, isFunc } from "../SqlQueryBuilder";
import * as SQLite from 'expo-sqlite';
import { useState, useEffect, useRef } from 'react'

const UseQuery = <T extends IId<D>, D extends string>(
    query: (IQuery<T, D>) | (SQLite.Query) | (() => Promise<T[]>),
    dbContext: IDatabase<D>,
    tableName: D,
    onItemChange?: (items: T[]) => T[],
) => {
    const [_, setUpdater] = useState<undefined | number>();
    const [isLoading, setIsLoading] = useState(true);
    const dataRef = useRef<IQueryResultItem<T, D>[]>([]);
    const refTimer = useRef<any>();
    const refWatcher = useRef(dbContext.watch<T>(tableName));
    const refMounted = useRef(false);

    const refreshData = async () => {
        if (!refMounted.current)
            return;
        clearTimeout(refTimer.current);
        refTimer.current = setTimeout(async () => {
            try {
                if (!refMounted.current)
                    return;
                setIsLoading(true);
                const sQuery = query as SQLite.Query;
                const iQuery = query as IQuery<T, D>;
                const fn = query as () => Promise<T[]>;
                if (iQuery.Column !== undefined) {
                    dataRef.current = await iQuery.toList();
                } else if (!isFunc(query)) {
                    const r = [] as IQueryResultItem<T, D>[];
                    for (const x of (await dbContext.find(sQuery.sql, sQuery.args, tableName))) {
                        r.push(await createQueryResultType<T, D>(x, dbContext));
                    }
                    dataRef.current = r;
                } else {
                    const r = [] as IQueryResultItem<T, D>[];
                    for (const x of (await fn())) {
                        r.push(await createQueryResultType<T, D>(x, dbContext));
                    }
                    dataRef.current = r;
                }
                update();
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        }, 0);
    }

    const update = () => {
        if (!refMounted.current)
            return;
        setUpdater(x => ((x ?? 0) > 100 ? 0 : (x ?? 0)) + 1);
    }

    const onSave = async (items: T[]) => {
        try {
            if (!refMounted.current)
                return;
            if (onItemChange == undefined)
                await refreshData();
            else {
                setIsLoading(true);
                items = [...items, ...(dataRef.current.filter(x => !items.find(a => a.id == x.id)))];
                const itemsAdded = onItemChange(items);
                const r = [] as IQueryResultItem<T, D>[];
                for (const x of itemsAdded) {
                    r.push(await createQueryResultType(x, dbContext));
                }
                dataRef.current = r;
                update();
                setIsLoading(false);
            }
        } catch (e) {
            console.error(e);
            setIsLoading(false);
        }
    }

    const onDelete = async (items: T[]) => {
        try {
            if (!refMounted.current)
                return;
            let updateList = false;
            const r = [...dataRef.current]
            items.forEach(a => {
                if (r.find(x => a.id == x.id)) {
                    r.splice(r.findIndex(x => a.id == x.id), 1);
                    updateList = true;
                }
            });

            if (updateList) {
                dataRef.current = r;
                update();
            }
        } catch (e) {
            console.error(e);
        }
    }

    const onBulkSave = async () => {
        if (!refMounted.current)
            return;
        await refreshData();
    }

    refWatcher.current.identifier = "Hook";
    refWatcher.current.onSave = async (items, operation) => await onSave(items);
    refWatcher.current.onBulkSave = async () => await onBulkSave();
    refWatcher.current.onDelete = async (items) => await onDelete(items);

    useEffect(() => {
        refMounted.current = true;
        refreshData();
        return () => {
            clearTimeout(refTimer.current);
            refWatcher.current.removeWatch();
            refMounted.current = false;
        }
    }, [])

    return [dataRef.current, isLoading, refreshData, dbContext] as const
}

export default UseQuery;