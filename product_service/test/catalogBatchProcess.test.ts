import { handler } from "../lambdas/catalogBatchProcess";
import { SQSEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const dynamoMock = mockClient(DynamoDBClient);
const snsMock = mockClient(SNSClient);

describe("catalogBatchProcess Lambda", () => {
  beforeEach(() => {
    dynamoMock.reset();
    snsMock.reset();
  });

  it("should store products in DynamoDB and send SNS notifications", async () => {
    dynamoMock.on(PutItemCommand).resolves({});
    snsMock.on(PublishCommand).resolves({});

    const mockEvent: SQSEvent = {
      Records: [
        {
          body: JSON.stringify({
            id: "123",
            title: "Test Product",
            description: "Awesome product",
            price: 100,
            count: 20,
          }),
        },
      ],
    } as any;

    await handler(mockEvent);

    expect(dynamoMock.commandCalls(PutItemCommand).length).toBe(1);
    expect(snsMock.commandCalls(PublishCommand).length).toBe(1);
  });

  it("should log an error and not crash if DynamoDB fails", async () => {
    dynamoMock.on(PutItemCommand).rejects(new Error("DynamoDB Error"));
    snsMock.on(PublishCommand).resolves({});

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    const mockEvent: SQSEvent = {
      Records: [
        {
          body: JSON.stringify({
            id: "123",
            title: "Test Product",
            description: "Awesome product",
            price: 100,
            count: 20,
          }),
        },
      ],
    } as any;

    await handler(mockEvent);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Error processing batch")
    );

    consoleErrorSpy.mockRestore();
  });
});
