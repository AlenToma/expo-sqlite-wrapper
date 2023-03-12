import TableBuilder from '../TableStructor'
export interface DetaliItems {
    id: number;
    title: string;
    image: string;
    description?: string;
    novel: string;
    parserName: string;
    chapterIndex: number;
    isFavorit?: boolean;
    children?:Chapters[]
}

export interface Chapters {
    id: number;
    chapterUrl: number;
    isViewed?: boolean;
    currentProgress: number;
    audioProgress: number;
    finished?: boolean;
    detaliItem_Id: number;
    unlocked?: boolean;
}

export type TableNames = 'DetaliItems' | 'Chapters';

export const tables = [
    TableBuilder<DetaliItems, TableNames>("DetaliItems").column("id").number.autoIncrement.primary
        .column("title")
        .column("image").encrypt("testEncryptions")
        .column("description").nullable
        .column("novel").encrypt("testEncryptions")
        .column("parserName")
        .column("chapterIndex").number
        .column("isFavorit").boolean,
    TableBuilder<Chapters, TableNames>("Chapters").column("id").number.autoIncrement.primary
        .column("chapterUrl").encrypt("testEncryptions")
        .column("isViewed").boolean.nullable
        .column("currentProgress").number.nullable
        .column("audioProgress").number
        .column("finished").boolean.nullable
        .column("detaliItem_Id").number
        .column("unlocked").boolean.nullable
        .constrain<DetaliItems>("detaliItem_Id", "DetaliItems", "id")
]