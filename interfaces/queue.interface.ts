export interface IQueue{
    connection:any;
    on:(eventName:string, event:any) => void;
    emit:(eventName:string, event:any) => void;
}