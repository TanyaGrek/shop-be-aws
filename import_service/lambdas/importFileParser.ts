import { S3Event, S3Handler } from "aws-lambda";
import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import csv from "csv-parser";
import { Readable } from "stream";
import { SdkStreamMixin } from '@smithy/types';

const s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });

export const handler: S3Handler = async (event: S3Event): Promise<void> => {
  console.log("Incoming S3 Event:", JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const bucketName = record.s3.bucket.name;
    const objectKey = record.s3.object.key;
    const parsedKey = objectKey.replace("uploaded/", "parsed/");

    try {
      const getObjectParams = { Bucket: bucketName, Key: objectKey };
      const { Body } = await s3Client.send(new GetObjectCommand(getObjectParams));

      if (!Body) {
        console.error(`Failed to retrieve file: ${objectKey}`);
        return;
      }

      // ✅ Wrap stream in a Promise to ensure it completes before returning
      await new Promise<void>((resolve, reject) => {
        const stream = Body as SdkStreamMixin & Readable;
        console.log(`Processing file: ${objectKey}`);

        stream
          .pipe(csv())
          .on("data", (data) => {
            console.log("Parsed Record:", data); // ✅ Now Jest will capture this log
          })
          .on("end", () => {
            console.log(`File ${objectKey} successfully processed.`);
            resolve();
          })
          .on("error", (err) => {
            console.error("CSV Parsing Error:", err);
            reject(err);
          });
      });

      // const stream = Body as Readable;
      // stream
      //   .pipe(csv())
      //   .on("data", (data) => {
      //     console.log("Parsed Record:", data);
      //   })
      //   .on("end", async () => {
      //     console.log(`Processing completed for file: ${objectKey}`);
      //
      //     // ✅ Copy file to parsed/ folder
      //     await s3Client.send(new CopyObjectCommand({
      //       Bucket: bucketName,
      //       CopySource: `${bucketName}/${objectKey}`,
      //       Key: parsedKey,
      //     }));
      //
      //     // ✅ Delete original file
      //     await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: objectKey }));
      //     console.log(`File moved to ${parsedKey} and deleted from ${objectKey}`);
      //   });

    } catch (error) {
      console.error("Error processing file:", error);
    }
  }
};
