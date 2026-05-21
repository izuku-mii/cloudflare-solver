const fs = require('fs')
const { connect } = require('puppeteer-real-browser')

async function cfBypass(url) {
    const { browser, page } = await connect({
        headless: true,
        turnstile: true
    })

    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
    )

    await page.setExtraHTTPHeaders({
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8',
        'cache-control': 'no-cache'
    })

    await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 0
    })

    // ambil cookies
    const cookies = await page.cookies()

    // ubah jadi header cookie
    const cookieHeader = cookies
        .map(v => `${v.name}=${v.value}`)
        .join('; ')

    const result = {
        link: url,
        headers: {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',

            'Accept-Language':
                'id-ID,id;q=0.9,en-US;q=0.8',

            'Cookie': cookieHeader
        }
    }

    await browser.close()

    return result
}

module.exports = cfBypass
