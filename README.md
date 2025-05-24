# 🚀 Auto-Expire Docs Vault

**Never Forget a Document Expiry Again!** 🧠📅

---

## 🔍 Problem Statement

Managing expiry dates for documents (insurance, licenses, contracts, etc.) is often neglected or forgotten, leading to late penalties, legal issues, or chaos. This project solves that by:

* Auto-extracting expiry dates from uploaded documents
* Storing them securely
* Scheduling timely reminders before they expire

---

## 💡 Solution Overview

A full-stack AWS-powered system where users simply upload documents and the rest is *pure automation magic*.

* 🖼 **Frontend:** React + Tailwind (Hosted on S3)
* 🧠 **Backend:** Node.js (Hosted on EC2)
* 📜 **Document Parsing:** AWS Comprehend
* 🗃️ **Database:** DynamoDB
* 🔔 **Reminders:** AWS Lambda + EventBridge
* 📩 **Notifications:** AWS SNS

---

## 🏗 Architecture

```
[User] → [React App (S3)] → [API (Node.js on EC2)]
     → [AWS Comprehend for text extraction]
     → [DynamoDB stores expiry info]
     → [EventBridge triggers Lambda checks]
     → [SNS sends email/SMS alerts]
```

---

## 🔧 Features

* Upload any PDF or DOCX file
* Auto-identify dates using regex + AWS Comprehend
* Intelligently pick *expiry* date (not random ones)
* Store extracted data in DynamoDB
* Receive alerts **7 days before expiry**

---

## ⚙ Tech Stack

* **Frontend:** React, Tailwind, Framer Motion, Three.js
* **Backend:** Node.js, Express, Multer, AWS SDK v3
* **AWS:** S3, EC2, Comprehend, SNS, DynamoDB, Lambda, EventBridge

---

## 🔥 How It Works (Simplified)

1. User uploads a document.
2. Backend hits AWS Comprehend to extract text.
3. Regex scans for dates, and expiry-related keywords.
4. Data is saved in DynamoDB.
5. Lambda + EventBridge scan for expiry windows every 24h.
6. If a doc is expiring in 7 days, SNS shoots an alert!

---

## 🧪 Demo Tips

* Upload a doc with an expiry within the next 7 days to trigger instant notification.
* Use logs to verify DynamoDB + SNS activity.
* Show the futuristic animated UI and the relaxing 3D scene.

---

## 🏁 Running Locally

```bash
# Frontend
cd client
npm install
npm run dev

# Backend
cd server
npm install
node server.js
```

---

## 😎 Author

Made with way too much caffeine ☕ and a fear of missed deadlines 😵‍—by Varun Pareek
