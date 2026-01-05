# Cliq - AI Interview Platform

AI-powered video interview platform that automates candidate screening with natural conversations.

## Integration API

### Create Interview

Create a new AI interview for a candidate. Used for Zapier/Airtable integrations.

**Endpoint:** `POST https://usecliq.com/api/integrations/create-interview`

**Headers:**
```
Content-Type: application/json
x-api-key: YOUR_INTEGRATION_API_KEY
```

**Request Body:**
```json
{
  "candidateName": "John Doe",
  "candidatePhone": "+1234567890",
  "candidateEmail": "john@example.com",
  "webhookUrl": "https://hooks.zapier.com/hooks/catch/xxx"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `candidateName` | string | Yes | Full name of the candidate |
| `candidatePhone` | string | Yes | Phone number (for SMS tracking) |
| `candidateEmail` | string | No | Email address |
| `webhookUrl` | string | No | URL to POST results when interview completes |

**Success Response (200):**
```json
{
  "success": true,
  "interviewId": "fb10e665-22e8-4b8c-b8e0-1db55087680d",
  "interviewUrl": "https://usecliq.com/candidate/interview/02e4a8b8...",
  "message": "Interview created successfully"
}
```

**Error Responses:**
- `401` - Invalid API key
- `400` - Missing required fields
- `500` - Server error

**Example (cURL):**
```bash
curl -X POST https://usecliq.com/api/integrations/create-interview \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "candidateName": "Test User",
    "candidatePhone": "+1234567890",
    "webhookUrl": "https://hooks.zapier.com/hooks/catch/xxx"
  }'
```

---

### Webhook Callback (On Interview Completion)

When an interview is completed, if a `webhookUrl` was provided, we POST the results:

**Webhook Payload:**
```json
{
  "interviewId": "fb10e665-22e8-4b8c-b8e0-1db55087680d",
  "candidateName": "John Doe",
  "candidatePhone": "+1234567890",
  "candidateEmail": "john@example.com",
  "status": "completed",
  "score": 72,
  "decision": "viable",
  "summary": "Strong customer service skills with good availability...",
  "strengths": [
    "Enthusiastic about the role",
    "Flexible schedule",
    "Prior cafe experience"
  ],
  "concerns": [
    "Limited experience with espresso machines"
  ],
  "interviewUrl": "https://usecliq.com/candidate/interview/02e4a8b8..."
}
```

| Field | Description |
|-------|-------------|
| `score` | Overall score (0-100) |
| `decision` | `"viable"`, `"not_viable"`, or `"review"` |
| `strengths` | Array of positive observations |
| `concerns` | Array of potential issues |
| `summary` | Brief AI-generated summary |

---

## Environment Variables

```bash
# Required for Integration API
INTEGRATION_API_KEY=your-secret-api-key
YUMMY_FUTURE_TEMPLATE_ID=uuid-of-interview-template

# Future: Pass templateId in request body instead of using env var
# templateId: "uuid" (Option C - not yet implemented)
```

---

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)