# Analytics API

## Endpoints

- `POST /api/analytics/events`
  - Body:
    - `eventName: string` (required)
    - `payload: object` (optional)
  - Response:
    - `{ item: AnalyticsEvent }`

- `GET /api/analytics/summary`
  - Response:
    - `totalEvents`
    - `byEvent` (counts per event name)
    - `byDay` (counts per YYYY-MM-DD)
    - `productClicks` (counts for `product_link_click` by productId)

## Storage

Events are stored in local JSON at:

- `<MEDIA_DIR>/analytics/events.json`
