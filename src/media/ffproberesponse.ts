import { ResponseType } from "../enums";
import { iResponse, iValue } from "../interfaces";
import { HttpResponse } from "../httpresponse";
import { JPathProvider, jpathFind, jpathFindAll, JsonDoc } from "../json/jpath";
import { wrapAsValue } from "../helpers";
import { ValuePromise } from "../value-promise";
import { JsonResponse } from "../json/jsonresponse";

export class FfprobeResponse
  extends JsonResponse
  implements iResponse, JPathProvider {
  public jsonDoc: JsonDoc | undefined;

  public get responseTypeName(): string {
    return "FFprobe Data";
  }

  public get responseType(): ResponseType {
    return "ffprobe";
  }

  public get jsonBody(): iValue {
    return wrapAsValue(this.context, this.jsonDoc?.root, "FFprobe Data");
  }

  public init(httpResponse: HttpResponse) {
    super.init(httpResponse);
    try {
      this.jsonDoc = new JsonDoc(httpResponse.json);
    } catch (ex) {
      this.context.logFailure("Error parsing ffprobe output.", ex);
    }
  }

  public find = (path: string): ValuePromise => jpathFind(this, path);
  public findAll = (path: string): Promise<iValue[]> =>
    jpathFindAll(this, path);
}
