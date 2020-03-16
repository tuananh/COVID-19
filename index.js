const { parse } = require('papaparse')
const { groupBy, sum, sumBy, toNumber } = require('lodash')

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

function processCSVData(inputCsv) {
    const rowAggregated = []
    const { data } = parse(inputCsv)
    for (let i = 1; i < data.length; i += 1) {
        const row = data[i]
        const ts = row.slice(4, data.length).map(toNumber)
        const totalDays = ts.length
        rowAggregated.push({
            country: row[1],
            total: ts[totalDays-1], // because it's ts data (its already aggregated)
            yesterday: ts[totalDays - 1] - ts[totalDays - 2],
            last_7_days: ts[totalDays - 1] - ts[totalDays - 8]
        })
    }

    const finalOutput = []
    const groupedByCountry = groupBy(rowAggregated, 'country')

    for (const country of Object.keys(groupedByCountry)) {
        const group = groupedByCountry[country]        
        finalOutput.push({
            country,
            total: sumBy(group, 'total'),
            yesterday: sumBy(group, 'yesterday'),
            last_7_days: sumBy(group, 'last_7_days')
        })
    }

    return finalOutput
}

function aggregateData({ confirmCases, deathCases, recoverCases }) {
    const output = {}

    for (let i = 0; i < recoverCases.length; i += 1) {
        const row = recoverCases[i]
        if (!output[row.country]) {
            output[row.country] = {}
        } else {
            output[row.country]['recover'] = row
        }
    }

    for (let i = 0; i < confirmCases.length; i += 1) {
        const row = confirmCases[i]
        if (!output[row.country]) {
            output[row.country] = {}
        } else {
            output[row.country]['confirm'] = row
        }
    }

    for (let i = 0; i < deathCases.length; i += 1) {
        const row = deathCases[i]
        if (!output[row.country]) {
            output[row.country] = {}
        } else {
            output[row.country]['death'] = row
        }
    }

    return output
}

async function handleRequest(request) {
    const responses = await Promise.all(
        urls.map(url => fetch(url, { cf: { cacheTtl: 0 } }))
    )
    const [confirmCsv, deathCsv, recoverCsv] = await Promise.all(
        responses.map(gatherResponse)
    )

    // we want this output format:
    // country | confirmed | recovered | death | 1 day | 1 week

    const confirmCases = processCSVData(confirmCsv)
    const deathCases = processCSVData(deathCsv)
    const recoverCases = processCSVData(recoverCsv)
    const finalOutput = {
        confirmCases,
        deathCases,
        recoverCases
    }

    const init = {
        headers: {
            'content-type': type
        }
    }
    const resp = new Response(JSON.stringify(finalOutput, null, 2), init)
    resp.headers.set('Cache-Control', 'max-age=300')
    return resp
}

addEventListener('fetch', event => {
    return event.respondWith(handleRequest(event.request))
})
