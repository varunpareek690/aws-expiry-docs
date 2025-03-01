const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const { DynamoDBClient, PutItemCommand, ScanCommand } = require("@aws-sdk/client-dynamodb");
const { EventBridgeClient, PutRuleCommand, PutTargetsCommand } = require("@aws-sdk/client-eventbridge");
const app = express();
const PORT = 5000;
require('dotenv').config()
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });
const dynamoDB = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY_ID,
  },
});
const TABLE_NAME = process.env.TABLENAME;

const snsClient = new SNSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY_ID,
  },
});

const SNS_TOPIC_ARN = process.env.ARN_SNS;


const eventBridge = new EventBridgeClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY_ID,
  },
});

const setupEventbridgeRule = async (expiryDate, documentID) => {
  const ruleName = `ExpiryReminder_${Date.now()}`;

  const ruleParams = {
    Name: ruleName,
    ScheduleExpression: `cron(0 12 ${expiryDate.substring(8, 10)} ${expiryDate.substring(5, 7)} ? ${expiryDate.substring(0, 4)})`,
    State: "ENABLED",
  };

  await eventBridge.send(new PutRuleCommand(ruleParams));

  const targetParams = {
    Rule: ruleName,
    Targets: [
      {
        Id: "SNSExpiryReminder",
        Arn: SNS_TOPIC_ARN,
        Input: JSON.stringify({ message: `⚠️ Your document '${documentID}' expires on ${expiryDate}. Please renew it soon!` }),
      },
    ],
  };

  await eventBridge.send(new PutTargetsCommand(targetParams));
};

const extractExpiryDate = (text) => {
  const datePatterns = [
    { regex: /\b(\d{4})[\/\-](\d{2})[\/\-](\d{2})\b/, format: "YYYY-MM-DD" }, // YYYY/MM/DD or YYYY-MM-DD
    { regex: /\b(\d{2})[\/\-](\d{2})[\/\-](\d{4})\b/, format: "DD-MM-YYYY" }, // DD/MM/YYYY or DD-MM-YYYY
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern.regex);
    if (match) {
      let year, month, day;
      if (pattern.format === "YYYY-MM-DD") {
        [year, month, day] = [match[1], match[2], match[3]];
      } else {
        [day, month, year] = [match[1], match[2], match[3]];
      }

      if (parseInt(year) < 2000) continue; // Ignore incorrect past years (e.g., 1933)

      const standardizedDate = new Date(`${year}-${month}-${day}`).toISOString().split("T")[0];
      return standardizedDate;
    }
  }

  return null;
};

const isExpiringSoon = (expiryDate) => {
  if (!expiryDate) return false;

  const expiry = new Date(expiryDate);
  const today = new Date();
  const daysRemaining = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  return daysRemaining <= 7 && daysRemaining>=0;
  console.log(daysRemaining);
};

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const pdfBuffer = req.file.buffer;
    const data = await pdfParse(pdfBuffer);
    const extractedText = data.text;

    // Extract and standardize expiry date
    const expiryDate = extractExpiryDate(extractedText);
    if (!expiryDate) {
      return res.status(400).json({ error: "No expiry date found" });
    }

    const today = new Date().toISOString().split('T')[0];

    const putParams = {
      TableName: TABLE_NAME,
      Item: {
        documentID: { S: req.file.originalname },
        extractedText: { S: extractedText },
        expiryDate: { S: expiryDate },
        uploadDate: { S: today }
      },
    };

    await dynamoDB.send(new PutItemCommand(putParams));

    let snsSent = "No";
    console.log(isExpiringSoon(expiryDate), expiryDate);
    if (isExpiringSoon(expiryDate)) {
      console.log("SNS triggered from BACKEND for:", req.file.originalname, expiryDate);
      const message = `⚠️ Alert: Your document '${req.file.originalname}' expires on ${expiryDate}. Please renew it soon!`;

      await snsClient.send(
        new PublishCommand({
          TopicArn: SNS_TOPIC_ARN,
          Message: message,
          Subject: "Document Expiry Alert",
        })
      );

      console.log("✅ Instant SNS Notification Sent:", message);
      snsSent = "Yes";
    } else {
      setupEventbridgeRule(expiryDate, req.file.originalname);
    }

    return res.json({
      fileName: req.file.originalname,
      expiryDate,
      uploadDate: today,
      status: "Processed",
      message: "Expiry date saved successfully!",
      alertSent: snsSent === "Yes"
    });

  } catch (error) {
    console.error("Processing failed:", error);
    return res.status(500).json({ error: "Processing failed" });
  }
});

app.get("/documents", async (req, res) => {
  try {
    const params = {
      TableName: TABLE_NAME,
    };

    const result = await dynamoDB.send(new ScanCommand(params));

    // Transform DynamoDB format to a more frontend-friendly format
    const documents = result.Items.map(item => ({
      id: item.documentID.S,
      name: item.documentID.S,
      expiryDate: item.expiryDate.S,
      uploadDate: item.uploadDate ? item.uploadDate.S : new Date().toISOString().split('T')[0],
      status: "Processed"
    }));

    // Sort by upload date (newest first)
    documents.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

    return res.json(documents);
  } catch (error) {
    console.error("Failed to fetch documents:", error);
    return res.status(500).json({ error: "Failed to fetch documents" });
  }
});

app.get("/reminders", async (req, res) => {
  try {
    const params = {
      TableName: TABLE_NAME,
    };

    const result = await dynamoDB.send(new ScanCommand(params));

    const today = new Date();
    const reminders = [];

    result.Items.forEach(item => {
      const expiryDate = item.expiryDate.S;

      // Parse the expiry date
      const [day, month, year] = expiryDate.includes("/")
        ? expiryDate.split("/").map(Number)
        : expiryDate.split("-").map(Number);

      const expiry = new Date(year, month - 1, day);
      const daysRemaining = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

      if (daysRemaining <= 7 && daysRemaining > 0) {
        reminders.push({
          id: item.documentID.S,
          message: `Document '${item.documentID.S}' expires in ${daysRemaining} days (${expiryDate})`,
          type: daysRemaining <= 3 ? 'urgent' : 'reminder',
          expiryDate,
          daysRemaining
        });
      }
    });

    // Sort by days remaining (most urgent first)
    reminders.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return res.json(reminders);
  } catch (error) {
    console.error("Failed to fetch reminders:", error);
    return res.status(500).json({ error: "Failed to fetch reminders" });
  }
});

app.listen(PORT,'0.0.0.0', () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
