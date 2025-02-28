import { handler } from '../lambdas/getProductById';
import { products } from '../lambdas/data/mockProducts';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

describe('getProductById Lambda Function', () => {
  const mockContext: Partial<Context> = {};
  const mockCallback = () => {};

  it('should return product details if productId exists', async () => {
    const mockEvent: Partial<APIGatewayProxyEvent> = {
      pathParameters: {
        productId: products[0].id
      }
    };

    const response: APIGatewayProxyResult = await handler(mockEvent as any, mockContext as any, mockCallback as any) as APIGatewayProxyResult;
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(products[0]);
  });

  it('should return 404 if productId does not exist', async () => {
    const mockEvent = {
      pathParameters: {
        productId: 'non-existent-id'
      }
    };

    const response: APIGatewayProxyResult = await handler(mockEvent as any, mockContext as any, mockCallback as any) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).message).toBe('Product not found');
  });

  it('should return 404 if pathParameters is undefined', async () => {
    const mockEvent = {};

    const response: APIGatewayProxyResult = await handler(mockEvent as any, mockContext as any, mockCallback as any) as APIGatewayProxyResult;
    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).message).toBe('Product not found');
  });
});
