import { handler } from '../lambdas/createProduct';
import { mockClient } from "aws-sdk-client-mock";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';


// Mock AWS SDK DynamoDB client
const ddbMock = mockClient(DynamoDBClient);


describe('createProduct Lambda Function', () => {
  beforeEach(() => {
    ddbMock.reset(); // Reset mock before each test
  });

  const mockContext = {} as any;
  const mockCallback = (() => {}) as any;

  it('should return product details if product was created', async () => {
    ddbMock.on(TransactWriteItemsCommand).resolves({});

    const mockEvent: APIGatewayProxyEvent = {
      body: JSON.stringify({
        title: "Test Product",
        description: "A great product",
        price: 50,
        count: 10,
      }),
    } as any;

    const response: APIGatewayProxyResult = await handler(mockEvent, mockContext, mockCallback) as APIGatewayProxyResult;
    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body)).toHaveProperty("id");
  });

  it('should return 400 if product data is invalid', async () => {
    const mockEvent: APIGatewayProxyEvent = {
      body: JSON.stringify({
        title: "Test Product",
      }),
    } as any;

    const response: APIGatewayProxyResult = await handler(mockEvent, mockContext, mockCallback) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe('Invalid product data');
  });

  it("should return 500 on internal server error", async () => {
    ddbMock.on(TransactWriteItemsCommand).rejects(new Error("DynamoDB error"));

    const mockEvent: APIGatewayProxyEvent = {
      body: JSON.stringify({
        title: "Test Product",
        description: "A great product",
        price: 50,
        count: 10,
      }),
    } as any;

    const response: APIGatewayProxyResult = await handler(mockEvent, mockContext, mockCallback) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({ message: "Internal Server Error" });
  });
});
