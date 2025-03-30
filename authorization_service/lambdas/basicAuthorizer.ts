import {
  APIGatewayAuthorizerResult,
  APIGatewayTokenAuthorizerEvent,
} from "aws-lambda";


export const handler = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  try {
    console.log("Event: ", JSON.stringify(event));
    const { authorizationToken, methodArn } = event;
    if (!authorizationToken) {
      return generatePolicy("user", "Deny", methodArn);
    }
    if (!authorizationToken.startsWith("Basic ")) {
      return generatePolicy("user", "Deny", methodArn);
    }

    const token = authorizationToken.replace("Basic ", "");
    if (!token) {
      return generatePolicy("user", "Deny", methodArn);
    }
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [username, password] = decoded.split(":");

    const expectedPassword = process.env[username.toUpperCase()];

    if (!expectedPassword || password !== expectedPassword) {
      return generatePolicy(username, "Deny", methodArn);
    }
    return generatePolicy(username, "Allow", methodArn);
  } catch (error) {
    console.log("Error", error);
    return generatePolicy("user", "Deny", event.methodArn);
  }
};

const generatePolicy = (
  principalId: string,
  effect: "Allow" | "Deny",
  resource: string
): APIGatewayAuthorizerResult => {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context: {
      message: effect === "Allow" ? "Authorized" : "Unauthorized",
    },
  };
};
