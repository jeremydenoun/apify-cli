const Apify = require('apify');

Apify.main(async () => {
    const requestQueue = await Apify.openRequestQueue();
    await requestQueue.addRequest(new Apify.Request({ url: 'https://www.iana.org/' }));
    const pseudoUrls = [new Apify.PseudoUrl('https://www.iana.org/[.*]')];

    const crawler = new Apify.PuppeteerCrawler({
        requestQueue,
        handlePageFunction: async ({ request, page }) => {
            const title = await page.title();
            console.log(`Title of ${request.url}: ${title}`);
            await Apify.utils.puppeteer.enqueueLinks(page, 'a', pseudoUrls, requestQueue);
        },
        handleFailedRequestFunction: async ({ request }) => {
            console.log(`Request ${request.url} failed too many times`);
            await Apify.pushData({
                '#debug': Apify.utils.createRequestDebugInfo(request),
            })
        },
        maxRequestsPerCrawl: 50,
        maxConcurrency: 10,
    });

    await crawler.run();
});
