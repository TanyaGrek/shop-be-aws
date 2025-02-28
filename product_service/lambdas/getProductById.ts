import { APIGatewayProxyHandler } from 'aws-lambda';
import { products } from './data/mockProducts';

export const handler: APIGatewayProxyHandler = async (event) => {
  const { productId } = event.pathParameters || {};

  const product = products.find((p) => p.id === productId);

  if (!product) {
    return {
      statusCode: 404,
      headers: {
        'Access-Control-Allow-Origin': '*', // Allow all origins
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ message: 'Product not found' }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*', // Allow all origins
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(product),
  };
};
