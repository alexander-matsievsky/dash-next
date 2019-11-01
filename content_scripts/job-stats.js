// eslint-disable-next-line no-unused-vars
async function jobStats ({ jobId, projectId, spiderId }, retry = 0) {
  if (retry >= 3) {
    return console.error(`missed #job-stats ${retry} times`)
  }
  if (!document.getElementById('job-stats')) {
    return setTimeout(() => jobStats({ jobId, projectId, spiderId }, retry + 1), 1e3)
  }

  const jobKey = `${projectId}/${spiderId}/${jobId}`
  const JOB_COUNT = 7
  const { apikey } = await (await fetch('/api/v2/config')).json()
  const job = await (await fetch(`https://storage.scrapinghub.com/jobs/${jobKey}?apikey=${apikey}`)).json()
  const list = await (await fetch(`/api/jobs/list.json?project=${projectId}&spider=${job.spider}`)).json()
  if (!list.jobs.find(_ => _.id === jobKey)) list.jobs.push({ id: jobKey })
  list.jobs.sort((a, b) => +a.id.split('/')[2] - +b.id.split('/')[2])
  const jobI = list.jobs.findIndex(_ => _.id === jobKey)
  const jobs = await Promise.all(
    list.jobs.slice(Math.max(0, jobI + 1 - JOB_COUNT), jobI + 1).map(async ({ id }) => {
      const job = await (await fetch(`https://storage.scrapinghub.com/jobs/${id}?apikey=${apikey}`)).json()
      const stats = await (await fetch(`https://storage.scrapinghub.com/items/${id}/stats?apikey=${apikey}&format=json`)).json()
      const runtimeHours = ((job.finished_time || Date.now()) - (job.running_time || Date.now())) / 1000 / 60 / 60
      return {
        ...job,
        ...(job.scrapystats || {}),
        ...(stats.counts || {}),
        fieldstats: Object.keys(stats.counts || {}),
        job_key: id,
        runtime_hours: runtimeHours,
        scrapystats: Object.keys(job.scrapystats || {})
      }
    })
  )

  const statsGroups = [
    [
      'FIELDS',
      Array.from(new Set(jobs.map(_ => _.fieldstats).flat()))
        .filter(_ => !/\/|^_type$/.test(_))
        .sort()
    ],
    [
      'ITEMS',
      Array.from(new Set(jobs.map(_ => _.scrapystats).flat()))
        .filter(_ => /^item_/.test(_))
        .concat('runtime_hours')
        .sort()
    ],
    [
      'LOGS',
      Array.from(new Set(jobs.map(_ => _.scrapystats).flat()))
        .filter(_ => /^log_/.test(_))
        .sort()
    ],
    [
      'NETWORK',
      Array.from(new Set(jobs.map(_ => _.scrapystats).flat()))
        .filter(_ => /^(crawlera|downloader|dupefilter|httperror)/.test(_))
        .sort()
    ]
  ]
  statsGroups.push([
    'OTHER STATS',
    Array.from(
      function * () {
        const fieldstats = new Set(jobs.map(_ => _.fieldstats).flat())
        const groupedstats = new Set(statsGroups.map(_ => _[1]).flat())
        const scrapystats = new Set(jobs.map(_ => _.scrapystats).flat())
        for (const field of scrapystats) {
          if (groupedstats.has(field) || fieldstats.has(field)) continue
          if (['finish_reason', 'finish_time', 'pending_time', 'start_time'].includes(field)) continue
          yield field
        }
      }.call()
    ).sort()
  ])
  const datasets = statsGroups.reduce(
    (datasets, [title, fields]) => Object.assign(datasets, {
      [title]: jobs.flatMap((job, i, jobs) => {
        const curr = job
        const prev = jobs[i - 1] || {}
        const finishedTime = new Date(job.finished_time || Date.now()).toISOString()
        return fields.map(field => {
          const countCurr = curr[field] || 0
          const countPrev = prev[field] || 0
          const countChange = Object.keys(prev).length ? countCurr - countPrev : 0
          const countChangePct = +(countChange / countPrev * 100 || 0).toFixed(2)
          return {
            'finished on': finishedTime,
            'job href': `https://app.scrapinghub.com/p/${job.job_key}`,
            'job key': job.job_key,
            'job number': +job.job_key.split('/')[2],
            'Δcount %': Math.max(-100, Math.min(countChangePct, 100)),
            count: countCurr,
            field: field,
            Δcount: countChange
          }
        })
      })
    }),
    {}
  )

  const { width } = document.getElementById('job-stats').getBoundingClientRect()
  const columns = (width / 225 | 0) - 1
  const vega = {
    $schema: 'https://vega.github.io/schema/vega-lite/v4.0.0-beta.10.json',
    background: 'white',
    config: { mark: { tooltip: null } },
    datasets: datasets,
    title: `https://app.scrapinghub.com/p/${projectId}/${spiderId}/${jobId} ${job.spider}`,
    vconcat: Object.keys(datasets).map(title => ({
      columns: columns,
      data: { name: title },
      facet: { field: 'field', type: 'nominal', header: { labelLimit: 175 } },
      resolve: { scale: { y: 'independent' } },
      spec: {
        layer: [
          {
            encoding: {
              x: { field: 'job number', type: 'ordinal' },
              y: {
                axis: { maxExtent: 75, minExtent: 75 },
                field: 'count',
                scale: { zero: false },
                title: null,
                type: 'quantitative'
              }
            },
            height: 50,
            mark: {
              interpolate: 'basis',
              stroke: 'lightgray',
              type: 'line'
            },
            width: 100
          },
          {
            encoding: {
              color: {
                field: 'Δcount %',
                scale: { scheme: 'redblue', type: 'symlog' },
                type: 'quantitative'
              },
              href: { field: 'job href', type: 'nominal' },
              tooltip: [
                { field: 'field', type: 'nominal' },
                { field: 'count', type: 'quantitative' },
                { field: 'Δcount %', type: 'quantitative' },
                { field: 'Δcount', type: 'quantitative' },
                { field: 'job key', type: 'nominal' },
                { field: 'finished on', type: 'temporal' }
              ],
              x: { field: 'job number', type: 'ordinal' },
              y: {
                axis: { maxExtent: 75, minExtent: 75 },
                field: 'count',
                scale: { zero: false },
                title: null,
                type: 'quantitative'
              }
            },
            height: 50,
            mark: {
              filled: true,
              size: 75,
              stroke: 'gray',
              type: 'point'
            },
            width: 100
          }
        ]
      },
      title: title
    }))
  }
  console.debug(vega)
  document.getElementById('job-stats').after(
    Object.assign(document.createElement('div'), {
      className: 'panel',
      id: 'job-stats-next',
      innerHTML: '<div></div>',
      style: 'margin-top:34px;'
    })
  )
  document.getElementById('job-stats-next').appendChild(
    Object.assign(document.createElement('script'), {
      innerHTML: `vegaEmbed('#job-stats-next>div',${(JSON.stringify(vega))})`
    })
  )
}
