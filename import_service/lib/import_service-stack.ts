import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3Notifications from "aws-cdk-lib/aws-s3-notifications";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";


export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const importBucket = s3.Bucket.fromBucketName(this, "ImportBucket", "uploaded-files-ww");

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
        externalModules: [], // ✅ Ensure all dependencies are bundled
        nodeModules: ["csv-parser"] // ✅ Include csv-parser in deployment package
      },
      environment: {
        IMPORT_BUCKET_NAME: importBucket.bucketName,
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

    // API Gateway
    const api = new apigateway.LambdaRestApi(this, "ImportServiceAPI", {
      handler: importProductsFile,
      proxy: false,
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
