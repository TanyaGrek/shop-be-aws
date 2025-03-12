import * as dotenv from "dotenv";
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as snsSubscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from 'constructs';

dotenv.config();

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productsTable = dynamodb.Table.fromTableName(this, "ProductsTable", "products");
    const stocksTable = dynamodb.Table.fromTableName(this, "StocksTable", "stocks");

    // Get Products List Lambda
    const getProductsList = new lambda.Function(this, 'GetProductsListLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'getProductsList.handler',
      code: lambda.Code.fromAsset('./lambdas'),
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCKS_TABLE: stocksTable.tableName,
      },
    });

    // Get Product By ID Lambda
    const getProductById = new lambda.Function(this, 'GetProductByIdLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'getProductById.handler',
      code: lambda.Code.fromAsset('./lambdas'),
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCKS_TABLE: stocksTable.tableName,
      },
    });

    // Create New Product Lambda
    const createProduct = new NodejsFunction(this, "CreateProductLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "createProduct.handler",
      code: lambda.Code.fromAsset('./lambdas'),
      bundling: {
        minify: true,
      },
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCKS_TABLE: stocksTable.tableName,
      },
    });

    // API Gateway
    const api = new apigateway.LambdaRestApi(this, 'ProductServiceAPI', {
      handler: getProductsList,
      proxy: false,
      restApiName: 'Product Service API',
      deployOptions: {
        stageName: 'dev',
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ["Content-Type"],
      },
    });

    // /products endpoint
    const productsResource = api.root.addResource('products');
    productsResource.addMethod('GET', new apigateway.LambdaIntegration(getProductsList),
      {
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': true,
            },
          },
        ],
      });
    productsResource.addMethod("POST", new apigateway.LambdaIntegration(createProduct),
      {
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': true,
            },
          },
        ],
      });

    // /products/{productId} endpoint
    const productByIdResource = productsResource.addResource('{productId}');
    productByIdResource.addMethod('GET', new apigateway.LambdaIntegration(getProductById),
      {
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': true,
            },
          },
        ],
      });

    // Create an SQS Queue
    const catalogItemsQueue = new sqs.Queue(this, 'CatalogItemsQueue', {
      queueName: 'catalogItemsQueue',
      visibilityTimeout: cdk.Duration.seconds(30), // Ensures message processing before retry
      retentionPeriod: cdk.Duration.days(4),
    });

    // Create SNS Topic
    const createProductTopic = new sns.Topic(this, "CreateProductTopic", {
      topicName: "createProductTopic",
    });

    // Add Email Subscription (Replace with your email)
    createProductTopic.addSubscription(
      new snsSubscriptions.EmailSubscription(process.env.EMAIl_1!)
    );

    // High-Price Products Subscription
    createProductTopic.addSubscription(
      new snsSubscriptions.EmailSubscription(process.env.EMAIl_2!, {
        filterPolicy: {
          price: sns.SubscriptionFilter.numericFilter({
            greaterThanOrEqualTo: 100, // Send only if price ≥ 100
          }),
        },
      })
    );

    // Create the catalogBatchProcess Lambda
    const catalogBatchProcess = new lambda.Function(this, "CatalogBatchProcessLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "catalogBatchProcess.handler",
      code: lambda.Code.fromAsset("lambdas"),
      environment: {
        SNS_TOPIC_ARN: createProductTopic.topicArn,
        PRODUCTS_TABLE: productsTable.tableName,
        STOCKS_TABLE: stocksTable.tableName,
      },
    });

    // Configure Lambda to Trigger on SQS Messages (Batch of 5)
    catalogBatchProcess.addEventSource(
      new lambdaEventSources.SqsEventSource(catalogItemsQueue, {
        batchSize: 5,
      })
    );

    // Allow Lambda to Publish to SNS
    createProductTopic.grantPublish(catalogBatchProcess);

    // Outputs
    new cdk.CfnOutput(this, "SNSProductTopicARN", {
      value: createProductTopic.topicArn,
    });

    // Output SQS URL for reference
    new cdk.CfnOutput(this, "CatalogItemsQueueURL", {
      value: catalogItemsQueue.queueUrl,
    });

    // DB Permissions
    productsTable.grantReadData(getProductsList);
    stocksTable.grantReadData(getProductsList);
    productsTable.grantReadData(getProductById);
    stocksTable.grantReadData(getProductById);
    productsTable.grantWriteData(createProduct);
    stocksTable.grantWriteData(createProduct);
    productsTable.grantWriteData(catalogBatchProcess);
    stocksTable.grantWriteData(catalogBatchProcess);
  }
}
