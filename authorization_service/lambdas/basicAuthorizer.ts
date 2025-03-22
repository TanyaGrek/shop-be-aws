
export const handler = async (event: { authorizationToken: string; methodArn: any; }) => {
  console.log("Incoming request:", JSON.stringify(event));
  if (!event.authorizationToken) {
    return {
      statusCode: 401,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Unauthorized: No token provided" }),
    };
  }

  const encodedCreds = event.authorizationToken.split(" ")[1];
  const decodedCreds = Buffer.from(encodedCreds, "base64").toString("utf-8");
  const [username, password] = decodedCreds.split(":");

  const expectedPassword = process.env[username];

  if (!expectedPassword || expectedPassword !== password) {
    return {
      statusCode: 403,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Forbidden: Invalid credentials" }),
    };
  }

  return {
    principalId: username,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: "Allow",
          Resource: event.methodArn,
        },
      ],
    },
    context: { username },
  };
};
