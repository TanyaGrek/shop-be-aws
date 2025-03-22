import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET_NAME = process.env.IMPORT_BUCKET_NAME || "test-bucket";
const REGION = process.env.AWS_REGION || "us-east-2";

const s3Client = new S3Client({ region: REGION });

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  console.log("Incoming request:", JSON.stringify(event, null, 2));

  try {
    const fileName = event.queryStringParameters?.name;

    if (!fileName) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Authorization, Content-Type",
        },
        body: JSON.stringify({ message: "Missing 'name' query parameter" }),
      };
    }

    const filePath = `uploaded/${fileName}`;
    const params = {
      Bucket: BUCKET_NAME,
      Key: filePath,
      ContentType: "text/csv",
    };

    const signedUrl = await getSignedUrl(s3Client, new PutObjectCommand(params), { expiresIn: 60 });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      },
        body: signedUrl,
    };
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      },
      body: JSON.stringify({ message: "Internal Server Error!!!" }),
    };
  }
};
