import * as dotenv from "dotenv";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3Notifications from "aws-cdk-lib/aws-s3-notifications";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as iam from 'aws-cdk-lib/aws-iam';

dotenv.config();

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Import the Authorization Service stack
    const authorizerLambda = lambda.Function.fromFunctionArn(
      this,
      'BasicAuthorizerLambda',
      process.env.BASIC_AUTHORIZER_ARN!
    );

    // Create a Lambda Authorizer
    const authorizer = new apigateway.TokenAuthorizer(this, 'ImportServiceAuthorizer', {
      handler: authorizerLambda,
      identitySource: apigateway.IdentitySource.header('Authorization'),
      resultsCacheTtl: cdk.Duration.seconds(0),
    });

    const importBucket = s3.Bucket.fromBucketName(this, "ImportBucket", "uploaded-files-ww");

    // Use existing SQS queue from Product Service
    const catalogItemsQueue = sqs.Queue.fromQueueArn(
      this,
      "CatalogItemsQueue",
      process.env.SQS_ARN!
    );

    // Create Lambda Function
    const importProductsFile = new lambda.Function(this, "ImportProductsFileLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "importProductsFile.handler",
      code: lambda.Code.fromAsset("./lambdas"),
      environment: {
        IMPORT_BUCKET_NAME: importBucket.bucketName,
      },
    });

    // Create Lambda Function to Parse CSV
    const importFileParserLambda = new lambdaNodejs.NodejsFunction(this, "ImportFileParserLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "importFileParser.handler",
      code: lambda.Code.fromAsset("./lambdas"),
      bundling: {
        externalModules: [],
        nodeModules: ["csv-parser"]
      },
      environment: {
        IMPORT_BUCKET_NAME: importBucket.bucketName,
        SQS_URL: catalogItemsQueue.queueUrl,
      },
    });

    // Add S3 Event Notification for "uploaded/" Folder
    importBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3Notifications.LambdaDestination(importFileParserLambda),
      { prefix: "uploaded/" } // Triggers only for files in 'uploaded/' folder
    );


    // Grant Lambda permission to generate signed URLs for S3
    importBucket.grantPut(importProductsFile);
    // Grant Lambda Permission to Read/Put/Delete S3 Objects
    importBucket.grantRead(importFileParserLambda);
    importBucket.grantPut(importFileParserLambda);
    importBucket.grantDelete(importFileParserLambda);
    // Grant Lambda permission to send messages to SQS
    catalogItemsQueue.grantSendMessages(importFileParserLambda);

    // API Gateway
    const api = new apigateway.LambdaRestApi(this, "ImportServiceAPI", {
      handler: importProductsFile,
      proxy: false,
      restApiName: "Import Service API",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ["Content-Type", "Authorization"],
      },
      deployOptions: {
        stageName: 'dev',
      },
    });


    const region = process.env.REGION!
    const accountId = process.env.ACCOUNT_ID!
    // Add permissions after authorizer is created. These will be associated with the authorizer through the sourceArn
    new lambda.CfnPermission(this, "AuthorizerPermission", {
      action: "lambda:InvokeFunction",
      functionName: authorizerLambda.functionName,
      principal: "apigateway.amazonaws.com",
      sourceArn: `arn:aws:execute-api:${region}:${accountId}:${api.restApiId}/authorizers/*`,
    });

    // Add gateway responses for unauthorized and forbidden
    api.addGatewayResponse("Unauthorized", {
      type: apigateway.ResponseType.UNAUTHORIZED,
      statusCode: "401",
      responseHeaders: {
        "Access-Control-Allow-Origin": "'*'",
        "Access-Control-Allow-Headers": "'*'",
      },
      templates: {
        "application/json": '{"message": "Unauthorized", "statusCode": 401}',
      },
    });

    api.addGatewayResponse("Forbidden", {
      type: apigateway.ResponseType.ACCESS_DENIED,
      statusCode: "403",
      responseHeaders: {
        "Access-Control-Allow-Origin": "'*'",
        "Access-Control-Allow-Headers": "'*'",
      },
      templates: {
        "application/json": '{"message": "Forbidden", "statusCode": 403}',
      },
    });

    // Grant Import Lambda permission to invoke Authorization Lambda
    importProductsFile.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['lambda:InvokeFunction'],
      resources: [process.env.BASIC_AUTHORIZER_ARN!],
    }));

    // import endpoint
    const importResource = api.root.addResource("import");
    importResource.addMethod("GET", new apigateway.LambdaIntegration(importProductsFile), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
      requestParameters: {
        "method.request.querystring.name": true,
      },
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Methods': true,
            'method.response.header.Access-Control-Allow-Headers': true,
          },
        },
      ],
    });

    // Output API Gateway URL
    new cdk.CfnOutput(this, "ImportServiceAPIURL", {
      value: api.url,
    });
  }
}
