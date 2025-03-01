import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { Product, Stock } from "./types";

/**
 * Converts a raw DynamoDB item into a Product object.
 */
export function parseProduct(item: Record<string, AttributeValue>): Product {
  const parsedItem = unmarshall(item);
  return {
    id: parsedItem.id,
    title: parsedItem.title,
    description: parsedItem.description,
    price: parsedItem.price,
    count: 0, // Will be updated later
  };
}

/**
 * Converts a raw DynamoDB item into a Stock object.
 */
export function parseStock(item: Record<string, AttributeValue>): Stock {
  const parsedItem = unmarshall(item);
  return {
    product_id: parsedItem.product_id,
    count: parsedItem.count,
  };
}

export const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS, GET, POST. PUT, DELETE",
  "Access-Control-Allow-Headers": "Content-Type",
};

