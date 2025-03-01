import {
  DynamoDBClient,
  GetItemCommand,
} from '@aws-sdk/client-dynamodb';
import { APIGatewayProxyHandler } from "aws-lambda";

import { parseProduct, parseStock } from "./utils";
import { Product } from "./types";

const dynamoDB = new DynamoDBClient({ region: "us-east-2" });

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("Incoming request:", JSON.stringify(event, null, 2));

  try {
    const productsTable = process.env.PRODUCTS_TABLE!;
    const stocksTable = process.env.STOCKS_TABLE!;

    const productId = event.pathParameters?.productId;

    // Fetch stock for product
    const stockResponse = await dynamoDB.send(new GetItemCommand({
      TableName: stocksTable,
      Key: { product_id: { S: productId! } },
    }));

    const stock = stockResponse.Item ? parseStock(stockResponse.Item) : { count: 0 };

    // Fetch product by ID
    const productResponse = await dynamoDB.send(new GetItemCommand({
      TableName: productsTable,
      Key: { id: { S: productId! } },
    }));

    if (!productResponse.Item) {
      return { statusCode: 404, body: JSON.stringify({ message: "Product not found" }) };
    }

    const product: Product = parseProduct(productResponse.Item);

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ...product, count: stock.count }),
    };
  } catch (error) {
    console.log("ERROR: ", error)
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
