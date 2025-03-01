import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { products } from '../lambdas/data/mockProducts';

const client = new DynamoDBClient({ region: "us-east-2" }); // Change to your region

const populateDB = async () => {
  for (const product of products) {
    const id = uuidv4();

    // Insert into `products` table
    await client.send(
      new PutItemCommand({
        TableName: "products",
        Item: {
          id: { S: id },
          title: { S: product.title },
          description: { S: product.description },
          price: { N: product.price.toString() },
        },
      })
    );

    // Insert stock for the product
    await client.send(
      new PutItemCommand({
        TableName: "stocks",
        Item: {
          product_id: { S: id },
          count: { N: (Math.floor(Math.random() * 100) + 1).toString() }, // Random stock count
        },
      })
    );

    console.log(`Inserted product: ${product.title} (ID: ${id})`);
  }
};

populateDB().then(() => console.log("Database populated!")).catch(console.error);
