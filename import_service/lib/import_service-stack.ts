import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3Notifications from "aws-cdk-lib/aws-s3-notifications";

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create an S3 bucket
    const importBucket = new s3.Bucket(this, 'ImportBucket', {
      bucketName: 'uploaded-files-ww', // 🔹 Change to a unique name
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Deletes bucket on stack removal (for development)
      autoDeleteObjects: true, // Ensures objects are deleted with the bucket
      publicReadAccess: false, // No public access
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // Restrict public access
    });

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
    const importFileParserLambda = new lambda.Function(this, "ImportFileParserLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "importFileParser.handler",
      code: lambda.Code.fromAsset("./lambdas"),
      environment: {
        IMPORT_BUCKET_NAME: importBucket.bucketName,
      },
    });

    // Add S3 Event Notification for "uploaded/" Folder
    importBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3Notifications.LambdaDestination(importFileParserLambda),
      { prefix: "uploaded/" } // ✅ Triggers only for files in 'uploaded/' folder
    );


    // Grant Lambda permission to generate signed URLs for S3
    importBucket.grantPut(importProductsFile);
    // Grant Lambda Permission to Read S3 Objects
    importBucket.grantRead(importFileParserLambda);

    // API Gateway
    const api = new apigateway.LambdaRestApi(this, "ImportServiceAPI", {
      handler: importProductsFile,
      restApiName: "Import Service API",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
      deployOptions: {
        stageName: 'dev',
      },
    });

    // /import endpoint
    const importResource = api.root.addResource("import");
    importResource.addMethod("GET", new apigateway.LambdaIntegration(importProductsFile), {
      requestParameters: {
        "method.request.querystring.name": true,
      },
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        },
      ],
    });

    // Output API Gateway URL
    new cdk.CfnOutput(this, "ImportServiceAPIURL", {
      value: api.url,
    });
  }

    // Create "uploaded" folder in the bucket (this happens dynamically when files are uploaded)
    // new cdk.CfnOutput(this, 'ImportBucketName', {
    //   value: importBucket.bucketName,
    //   description: 'S3 bucket for file uploads',
    // });
  // }
}
