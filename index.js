const { parse } = require('papaparse')
const { groupBy, orderBy, sumBy, toNumber, merge, keyBy } = require('lodash')
const Table = require('cli-table');

const baseUrl =
    'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/'
const urls = [
    'time_series_19-covid-Confirmed.csv',
    'time_series_19-covid-Deaths.csv',
    'time_series_19-covid-Recovered.csv'
].map(p => baseUrl + p)
const type = 'application/json;charset=UTF-8'

/**
 * gatherResponse awaits and returns a response body as a string.
 * Use await gatherResponse(..) in an async function to get the response body
 * @param {Response} response
 */
async function gatherResponse(response) {
    const { headers } = response
    const contentType = headers.get('content-type')
    if (contentType.includes('application/json')) {
        return await response.json()
    } else if (contentType.includes('application/text')) {
        return await response.text()
    } else if (contentType.includes('text/html')) {
        return await response.text()
    } else {
        return await response.text()
    }
}

function processCSVData(inputCsv, type) {
    const rowAggregated = []
    const { data } = parse(inputCsv)
    for (let i = 1; i < data.length; i += 1) {
        const row = data[i]
        const ts = row.slice(4, data.length).map(toNumber)
        const totalDays = ts.length
        rowAggregated.push({
            country: row[1],
            total: ts[totalDays - 1], // because it's ts data (its already aggregated)
            yesterday: ts[totalDays - 1] - ts[totalDays - 2],
            last_7_days: ts[totalDays - 1] - ts[totalDays - 8]
        })
    }

    let finalOutput = []
    const groupedByCountry = groupBy(rowAggregated, 'country')

    for (const country of Object.keys(groupedByCountry)) {
        const group = groupedByCountry[country]
        finalOutput.push({
            country,
            [type]: {
                total: sumBy(group, 'total'),
                yesterday: sumBy(group, 'yesterday'),
                last_7_days: sumBy(group, 'last_7_days')
            }
        })
    }

    finalOutput = orderBy(finalOutput, ['confirm.total', 'death.total'], ['desc', 'desc'])

    return finalOutput
}

function aggregateData({ confirmCases, deathCases, recoverCases }) {
    const merged = merge(
        keyBy(confirmCases, 'country'),
        keyBy(recoverCases, 'country'),
        keyBy(deathCases, 'country')
    )
    return merged
}

function render(str) {
    return `
    <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>COVID19 stats</title>
            <style>
                pre {
                    font-family: Consolas, Monaco, monospace;
                }
            </style>
        </head>
        <body><pre>${str}</pre></body>
    </html>
`
}

async function handleRequest(request) {
    const responses = await Promise.all(
        urls.map(url => fetch(url, { cf: { cacheTtl: 300 } }))
    )
    const [confirmCsv, deathCsv, recoverCsv] = await Promise.all(
        responses.map(gatherResponse)
    )

    // we want this output format:
    // country | confirmed | recovered | death | 1 day | 1 week

    const confirmCases = processCSVData(confirmCsv, 'confirm')
    const deathCases = processCSVData(deathCsv, 'death')
    const recoverCases = processCSVData(recoverCsv, 'recover')
    const finalOutput = aggregateData({
        confirmCases,
        deathCases,
        recoverCases
    })

    const table = new Table({
        head: ['Country', 'Confirm', 'Deaths', 'Recover', 'Deaths yesterday', 'Deaths last 7 days']
    })

    for (const key of Object.keys(finalOutput)) {
        const row = finalOutput[key]
        table.push([row.country, row.confirm.total, row.death.total, row.recover.total, row.death.yesterday, row.death.last_7_days])
    }

    const init = {
        headers: {
            'Content-Type': 'text/html;charset=UTF-8',
            'Cache-Control': 'max-age=300'
        }
    }

    const agent = request.headers.get('User-Agent')
    if (agent && agent.includes('curl')) {
        return new Response(table.toString(), init)
    } else {
        return new Response(render(table.toString()), init)
    }
}

addEventListener('fetch', event => {
    return event.respondWith(handleRequest(event.request))
})
