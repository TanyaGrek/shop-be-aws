import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyHandler } from "aws-lambda";
import { parseProduct, parseStock } from "./utils";
import { Product } from "./types";

const dynamoDB = new DynamoDBClient({ region: "us-east-2" });

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("Incoming request:", JSON.stringify(event, null, 2));

  try {
    const productsTable = process.env.PRODUCTS_TABLE!;
    const stocksTable = process.env.STOCKS_TABLE!;

    // Fetch all products
    const productsResponse = await dynamoDB.send(new ScanCommand({ TableName: productsTable }));
    const products: Product[] = productsResponse.Items?.map(parseProduct) || [];

    // Fetch all stock data
    const stocksResponse = await dynamoDB.send(new ScanCommand({ TableName: stocksTable }));
    const stockMap: Record<string, number> = stocksResponse.Items?.reduce((acc, item) => {
      const stock = parseStock(item);
      acc[stock.product_id] = stock.count;
      return acc;
    }, {} as Record<string, number>) || {};

    // Merge products with stock counts
    const mergedProducts = products.map(product => ({
      ...product,
      count: stockMap[product.id] ?? 0, // Ensure count is always defined
    }));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(mergedProducts),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
