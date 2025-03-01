import {
  DynamoDBClient,
 TransactWriteItemsCommand
} from '@aws-sdk/client-dynamodb';
import { APIGatewayProxyHandler } from "aws-lambda";
import { marshall } from "@aws-sdk/util-dynamodb";
import { headers } from './utils';

// import { v4 as uuidv4 } from "uuid";

const dynamoDB = new DynamoDBClient({ region: "us-east-2" });

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("Incoming request:", JSON.stringify(event, null, 2));
  try {
    const productsTable = process.env.PRODUCTS_TABLE!;
    const stocksTable = process.env.STOCKS_TABLE!;

    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ message: "Missing request body" }) };
    }

    const { title, description, price, count } = JSON.parse(event.body);

    if (!title || !description || !price || typeof price !== "number" || !count || typeof count !== "number") {
      return { statusCode: 400, headers, body: JSON.stringify({ message: "Invalid product data" }) };
    }

    const productId = new Date().getMilliseconds().toString() // uuidv4(); TODO try to fix it

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


    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ id: productId, title, description, price, count }),
    };
  } catch (error) {
    console.log("ERROR: ", error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
