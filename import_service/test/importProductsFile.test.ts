import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { mockClient } from "aws-sdk-client-mock";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { handler } from "../lambdas/importProductsFile";

const s3Mock = mockClient(new S3Client());

describe("importProductsFile Lambda", () => {
  beforeEach(() => {
    s3Mock.reset();
    jest.clearAllMocks()
    process.env.BUCKET_NAME = "test-bucket";
    jest.mock('@aws-sdk/s3-request-presigner', () => ({
      getSignedUrl: jest.fn(),
    }));
  });

  const mockContext = {} as any;
  const mockCallback = (() => {}) as any;

  test("Returns signed URL when file name is provided", async () => {
    s3Mock.on(PutObjectCommand).resolves({});

    const event: APIGatewayProxyEvent = {
      queryStringParameters: { name: "test.csv" },
    } as any;

    const signedUrl = "https://mock-signed-url";
    jest.fn(getSignedUrl).mockResolvedValueOnce(signedUrl);

    const response: APIGatewayProxyResult = await handler(event, mockContext, mockCallback) as APIGatewayProxyResult;

    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.url).toContain("https://");
    expect(body.url).toContain("uploaded/test.csv");
  });

  test("Returns 400 if file name is missing", async () => {
    const event: APIGatewayProxyEvent = {} as any;
    const response: APIGatewayProxyResult = await handler(event, mockContext, mockCallback) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({ message: "Missing 'name' query parameter" });
  });

  test("Returns 500 if S3 operation fails", async () => {
    s3Mock.on(PutObjectCommand).rejects(new Error("S3 error"));

    const event: APIGatewayProxyEvent = {
      queryStringParameters: { name: "test.csv" },
    } as any;

    const response = await handler(event, mockContext, mockCallback)  as APIGatewayProxyResult;
    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({ message: "Internal Server Error" });
  });
});
