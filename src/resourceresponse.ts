import { iResponse, ResponseType, ProtoResponse } from "./response";
import { Value } from './value';
import { HttpResponse } from './httpresponse';

export class ResourceResponse extends ProtoResponse implements iResponse {

    public get responseType(): ResponseType {
        return ResponseType.resource;
    }

    public get responseTypeName(): string {
        return 'Resource';
    }

    public init(httpResponse: HttpResponse) {
        super.init(httpResponse);
        this.context.assert(this.statusCode).between(200, 299);
    }

    public async evaluate(context: any, callback: Function): Promise<any> {
        throw new Error('Evaluate does not support generic resources.');
    }

    public async find(path: string): Promise<Value> {
        throw new Error('Generic Response does not yet support select');
    }

    public async findAll(path: string): Promise<Value[]> {
        throw new Error('Generic Response does not yet support selectAll');
    }

}
