/* Temporary script to verify RapidAPI Zillow endpoint from Node.
   Usage (ensure env is loaded in this shell):
     RAPIDAPI_KEY=your_key node scripts/tmp-zillow-curl.js
   Optional:
     RAPIDAPI_HOST=zillow-com1.p.rapidapi.com
     LOCATION="Los Angeles, CA"
     STATUS_TYPE=ForSale
     HOME_TYPE=Houses
     PAGE=1
*/
const https = require('https')
const querystring = require('querystring')

const host = process.env.RAPIDAPI_HOST || 'zillow-com1.p.rapidapi.com'
const key = process.env.RAPIDAPI_KEY || ''
if (!key) {
  console.error('RAPIDAPI_KEY not set in environment')
  process.exit(1)
}

const location = process.env.LOCATION || 'Los Angeles, CA'
const statusType = process.env.STATUS_TYPE || 'ForSale'
const homeType = process.env.HOME_TYPE || 'Houses'
const page = process.env.PAGE || '1'

const qs = querystring.stringify({
  location,
  status_type: statusType,
  home_type: homeType,
  page,
})
const path = `/propertyExtendedSearch?${qs}`

const options = {
  method: 'GET',
  hostname: host,
  path,
  headers: {
    'x-rapidapi-key': key,
    'x-rapidapi-host': host,
  },
}

console.log('Requesting:', `https://${host}${path}`)
const req = https.request(options, (res) => {
  const chunks = []
  res.on('data', (c) => chunks.push(c))
  res.on('end', () => {
    const body = Buffer.concat(chunks).toString()
    console.log('STATUS', res.statusCode)
    console.log(body)
  })
})
req.on('error', (e) => console.error('ERR', e.message))
req.end()
