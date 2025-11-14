# Analytics APIs

## Emotion & Conversation Starter Analytics

- **GET** `/api/v1/analytics/emotions`
- **Auth**: Required (`Bearer <token>`)

### Query Parameters

| Param       | Type    | Description                                                               |
| ----------- | ------- | ------------------------------------------------------------------------- |
| `userId`    | string  | Filter analytics to messages sent by the specified user.                  |
| `chatId`    | string  | Limit analytics to a single chat.                                         |
| `startDate` | string  | ISO date string; include messages created on/after this date.             |
| `endDate`   | string  | ISO date string; include messages created on/before this date.            |
| `includeAI` | boolean | Include AI-authored messages in the emotion breakdown (default: `false`). |

### Response

```json
{
  "success": true,
  "message": "Emotion analytics fetched successfully.",
  "data": {
    "totalMessages": 1895,
    "totalCategorized": 1767,
    "includeAI": false,
    "filtersApplied": {
      "userId": null,
      "chatId": null,
      "startDate": null,
      "endDate": null
    },
    "emotions": [
      { "emotion": "anxiety", "count": 234, "percentage": 13.25 },
      { "emotion": "stress", "count": 167, "percentage": 9.45 },
      { "emotion": "happy", "count": 189, "percentage": 10.69 },
      { "emotion": "uncategorized", "count": 128, "percentage": 6.75 }
    ],
    "firstMessageStarters": {
      "total": 1024,
      "items": [
        {
          "message": "I'm feeling overwhelmed today",
          "count": 127,
          "percentage": 12.4
        },
        {
          "message": "I'm having a tough time in my relationships",
          "count": 132,
          "percentage": 12.89
        },
        {
          "message": "I need help with anxiety",
          "count": 235,
          "percentage": 22.95
        }
      ]
    }
  }
}
```

### Notes

- Emotion buckets are determined dynamically from the emotions stored on messages; no hard-coded mapping is applied.
- `firstMessageStarters` tallies the earliest human-authored message in each chat (after filters), grouped by the raw message text.
- Percentages are rounded to two decimal places for readability.
