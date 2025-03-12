import { SQSEvent } from "aws-lambda";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import {
  DynamoDBClient,
  TransactWriteItemsCommand
} from '@aws-sdk/client-dynamodb';
import { randomUUID } from 'crypto';
import { marshall } from '@aws-sdk/util-dynamodb';

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const snsClient = new SNSClient({ region: process.env.AWS_REGION });

export const handler = async (event: SQSEvent) => {
  console.log("Received event:", JSON.stringify(event));

  try {
    const productsTable = process.env.PRODUCTS_TABLE!;
    const stocksTable = process.env.STOCKS_TABLE!;

    for (const record of event.Records) {
      if (!record.body) {
        console.log('Missing request body');
      }

      console.log(JSON.parse(record.body))

      const { title, description, price, count } = JSON.parse(record.body);

      console.log("title, description, price, count")
      console.log(title, description, price, count)

      const productId = randomUUID();

      await dynamoDB.send(new TransactWriteItemsCommand({
        TransactItems: [
          {
            Put: {
              TableName: productsTable,
              Item: marshall({
                id: productId,
                title,
                description,
                price,
              }),
            },
          },
          {
            Put: {
              TableName: stocksTable,
              Item: marshall({
                product_id: productId,
                count,
              }),
            },
          },
        ],
      }));

      console.log(`Product ${title} added successfully`);

      // Publish to SNS Topic
      const snsMessage = new PublishCommand({
        TopicArn: process.env.SNS_TOPIC_ARN,
        Subject: "New Product Created",
        Message: `A new product has been added: ${title} (Price: $${price})`,
      });

      await snsClient.send(snsMessage);
      console.log(`SNS notification sent for product: ${title}`);
    }

    console.log("Batch processed successfully");
  } catch (error) {
    console.error("Error processing batch:", error);
  }
};
