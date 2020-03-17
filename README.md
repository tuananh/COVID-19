COVID-19 API
===========

- Data provided by [JHU CSSE](https://github.com/CSSEGISandData/COVID-19)
- Built with Cloudflare Workers

## Sample output

```json
{
  "China": {
    "country": "China",
    "confirm": {
      "total": 81033,
      "yesterday": 30,
      "last_7_days": 173
    },
    "recover": {
      "total": 67910,
      "yesterday": 893,
      "last_7_days": 9106
    },
    "death": {
      "total": 3217,
      "yesterday": 14,
      "last_7_days": 94
    }
  },
  "Italy": {
    "country": "Italy",
    "confirm": {
      "total": 27980,
      "yesterday": 3233,
      "last_7_days": 18808
    },
    "recover": {
      "total": 2749,
      "yesterday": 414,
      "last_7_days": 2025
    },
    "death": {
      "total": 2158,
      "yesterday": 349,
      "last_7_days": 1695
    }
  }
}
```

## TODO

[] Implement `curl` command