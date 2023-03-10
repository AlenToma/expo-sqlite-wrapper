import StringBuilder from "./StringBuilder";
class Errors{
   missingTableBuilder(tableName:string){
        const str = new StringBuilder().append("Missing TableBuilder for", tableName);
        console.error(str.toString());
        return str.toString();
    }
}

const errors = new Errors();
export default errors;