import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";

export class AuthorizationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const authorizerLambda = new lambdaNodejs.NodejsFunction(this, "BasicAuthorizerLambda", {
      runtime: lambda.Runtime.NODEJS_22_X,
      code: lambda.Code.fromAsset("./lambdas"),
      handler: "basicAuthorizer.handler",
      bundling: {
        externalModules: [],
      },
    });

    new cdk.CfnOutput(this, "BasicAuthorizerLambdaARN", {
      value: authorizerLambda.functionArn,
    });
  }
}
