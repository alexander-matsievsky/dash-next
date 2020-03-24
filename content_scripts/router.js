const routes = [
  {
    // eslint-disable-next-line no-undef
    handler: JobStats.inject,
    pattern: new RegExp('^/p/(?<projectId>\\d+)/(?<spiderId>\\d+)/(?<jobId>\\d+)$')
  }
]

function dispatchRoute ({ type, url }) {
  url = new URL(url)
  if (type !== 'router' || url.origin !== 'https://app.scrapinghub.com') return
  for (const { handler, pattern } of routes) {
    const match = url.pathname.match(pattern)
    if (match) handler(match.groups)
  }
}

[
  'https://cdn.jsdelivr.net/npm/vega@5.10.0',
  'https://cdn.jsdelivr.net/npm/vega-lite@4.8.1',
  'https://cdn.jsdelivr.net/npm/vega-embed@6.5.1'
].reduce(
  async (loaded, src) => {
    await loaded
    return new Promise((resolve, reject) => {
      const script = Object.assign(document.createElement('script'), { src })
      script.addEventListener('load', resolve)
      script.addEventListener('error', reject)
      document.head.appendChild(script)
    })
  },
  Promise.resolve()
).then(() => {
  dispatchRoute({ type: 'router', url: document.location.href })
  chrome.runtime.onMessage.addListener(dispatchRoute)
})
