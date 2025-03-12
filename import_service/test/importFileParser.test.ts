import { S3Event } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { SdkStreamMixin } from "@smithy/types";
import { handler } from "../lambdas/importFileParser";

// ✅ Function to wrap Readable into SdkStreamMixin
function toSdkStream(readable: Readable): SdkStreamMixin & Readable {
  return Object.assign(readable, {
    transformToByteArray: async () => Buffer.from(""),
    transformToString: async () => "",
    transformToWebStream: () => new ReadableStream(),
  });
}

const s3Mock = mockClient(S3Client);

describe("importFileParser Lambda", () => {
  beforeEach(() => {
    s3Mock.reset();
  });

  const mockContext = {} as any;
  const mockCallback = (() => {}) as any;

  test("Parses CSV file and logs data", async () => {
    const csvStream = toSdkStream(Readable.from([
      "title,description,price,count\n",
      "Product A,Best product,99,10\n",
      "Product B,Another item,49,5\n",
    ]));

    s3Mock.on(GetObjectCommand).resolves({ Body: csvStream });

    const event: S3Event = {
      Records: [{ s3: { bucket: { name: "test-bucket" }, object: { key: "uploaded/test.csv" } } }],
    } as any;

    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    await handler(event, mockContext, mockCallback);
    // expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Parsed Record:"));
    expect(consoleSpy.mock.calls.some(call => call[0].includes("Parsed Record:"))).toBeTruthy();

    consoleSpy.mockRestore();
  });

  test("Handles missing file gracefully", async () => {
    s3Mock.on(GetObjectCommand).resolves({ Body: undefined });

    const event: S3Event = {
      Records: [{ s3: { bucket: { name: "test-bucket" }, object: { key: "uploaded/test.csv" } } }],
    } as any;

    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    await handler(event, mockContext, mockCallback);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Failed to retrieve file"));
    consoleSpy.mockRestore();
  });
});
