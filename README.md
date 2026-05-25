# GCal Icon Worker

A simple Cloudflare worker to get a Google Calendar icon.

## URL format:
* `/icon`                      → returns icon for today in UTC
* `/icon?tz=Asia/Bangkok`      → returns icon for today in the given timezone
* `/icon?date=2026-05-24`      → returns icon for the given date (YYYY-MM-DD)
* Supported sizes via `?size=` query param: 16, 24, 32, 48, 64, 96 (default: 96)
Example: `/icon?tz=Asia/Bangkok&size=48`

