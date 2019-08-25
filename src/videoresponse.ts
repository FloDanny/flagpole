import { iResponse, ResponseType } from "./response";
import { Scenario } from "./scenario";
import { ProtoResponse, HttpResponse } from '.';

export class VideoResponse extends ProtoResponse implements iResponse {

    public get responseTypeName(): string {
        return 'Video';
    }

    public get responseType(): ResponseType {
        return ResponseType.video;
    }

    public init(httpResponse: HttpResponse) {
        super.init(httpResponse);
        this.context.assert('HTTP Status OK', this.statusCode).between(200, 299);
        this.context.assert('MIME Type matches expected value for video', this.header('Content-Type'))
            .matches(/(video|mpegurl)/i);
    }

    public async evaluate(context: any, callback: Function): Promise<any> {
        throw new Error('Evaluate does not support video resources.');
    }

    public async find(path: string): Promise<any | null> {
        throw new Error('Video Response does not yet support select');
    }

    public async findAll(path: string): Promise<any[]> {
        throw new Error('Video Response does not yet support selectAll');
    }

}
