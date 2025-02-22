import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { handler } from '../lambdas/getProductsList';
import { products } from '../lambdas/data/mockProducts';

describe('getProductsList Lambda', () => {
  const mockEvent: Partial<APIGatewayProxyEvent> = {};
  const mockContext: Partial<Context> = {};
  const mockCallback = () => {};

  it('should return a list of products with status code 200', async () => {
    const response = await handler(mockEvent as any, mockContext as any, mockCallback as any) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe(JSON.stringify(products));
  });
});
