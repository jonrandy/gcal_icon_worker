// Cloudflare Worker: Google Calendar dynamic date icon proxy
// Deploy at: workers.dev (free tier)
//
// URL format:
//   /icon                      → returns icon for today in UTC
//   /icon?tz=Asia/Bangkok      → returns icon for today in the given timezone
//   /icon?date=2026-05-24      → returns icon for the given date (YYYY-MM-DD)
//
// Supported sizes via ?size= query param: 16, 24, 32, 48, 64, 96 (default: 96)
// Example: /icon?tz=Asia/Bangkok&size=48

const DEFAULT_TZ = 'UTC' // 'Asia/Bangkok'

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const params = url.searchParams

    // --- Determine the date ---
    let dateStr = params.get("date") // override: YYYY-MM-DD
    if (!dateStr) {
      const tz = params.get("tz") || request.cf?.timezone || DEFAULT_TZ
      try {
        dateStr = new Date().toLocaleDateString("en-CA", { timeZone: tz })
        // en-CA gives YYYY-MM-DD format natively
      } catch {
        return new Response("Invalid timezone", { status: 400 })
      }
    }

    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!match) {
      return new Response("Invalid date format, use YYYY-MM-DD", { status: 400 })
    }

    const year = match[1]
    const day = match[3] // already zero-padded from YYYY-MM-DD

    // --- Determine icon size ---
    const validSizes = [16, 24, 32, 48, 64, 96]
    const requestedSize = parseInt(params.get("size") || "96", 10)
    const size = validSizes.includes(requestedSize) ? requestedSize : 96

    // --- Build the gstatic URL ---
    // Pattern: calendar_{year}_{day-of-month-zero-padded}
    // Month is not part of the path — the icon changes by day-of-month only
    const iconUrl = ["https://www.gstatic.com/images/branding/productlogos", `calendar_${year}_${day}`, "v2/png", `calendar_${year}_${day}_${size}dp.png`].join(
      "/"
    )

    // --- Fetch from gstatic ---
    let upstream
    try {
      upstream = await fetch(iconUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; CalendarIconProxy/1.0)",
        },
        cf: {
          cacheTtl: 3600,
          cacheEverything: true,
        },
      })
    } catch (err) {
      return new Response(`Failed to fetch icon: ${err.message}`, { status: 502 })
    }

    if (!upstream.ok) {
      return new Response(`gstatic returned ${upstream.status} for: ${iconUrl}`, { status: upstream.status })
    }

    // --- Stream the image back with appropriate headers ---
    const headers = new Headers({
      "Content-Type": upstream.headers.get("Content-Type") || "image/png",
      "Cache-Control": "public, max-age=3600",
      "X-Calendar-Icon-Url": iconUrl,
      "X-Calendar-Date": dateStr,
      "Access-Control-Allow-Origin": "*",
    })

    return new Response(upstream.body, { status: 200, headers })
  },
}
