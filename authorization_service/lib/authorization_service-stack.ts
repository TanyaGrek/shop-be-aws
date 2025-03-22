import * as dotenv from "dotenv";
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from "aws-cdk-lib/aws-lambda";

dotenv.config();

export class AuthorizationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const authorizerLambda = new lambda.Function(this, "BasicAuthorizerLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset("lambdas"),
      handler: "basicAuthorizer.handler",
    });

    new cdk.CfnOutput(this, "BasicAuthorizerLambdaARN", {
      value: authorizerLambda.functionArn,
    });
  }
}
