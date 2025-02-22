import { APIGatewayProxyHandler } from 'aws-lambda';
import { products } from './data/mockProducts';

export const handler: APIGatewayProxyHandler = async ()  => {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(products),
  };
};
