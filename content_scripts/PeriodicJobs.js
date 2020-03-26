class PeriodicJobs extends HTMLElement {
  constructor () {
    super()
    this.projectId = this.getAttribute('project-id')
    this.schedule = this.fetchSchedule()
  }

  static async inject ({ projectId }) {
    const selectors = '.dash-page>div:first-child'
    const periodicJobs = new window.DOMParser().parseFromString(
      `<dash-next-periodic-jobs project-id="${projectId}">`,
      'text/html'
    ).querySelector('dash-next-periodic-jobs')
    await new Promise(resolve => {
      const interval = window.setInterval(() => {
        if (document.querySelector(selectors)) {
          resolve(window.clearInterval(interval))
        }
      }, 500)
    })
    document.querySelector(selectors).after(periodicJobs)
  }

  connectedCallback () {
    window.addEventListener('resize', () => this.render())
    this.render()
  }

  async fetchSchedule () {
    const calendar = Array(31)
      .fill(new Date(Date.now()))
      .map((now, i) => new Date(now.setUTCDate(i + 1)))
      .filter(function (date) {
        return date.getUTCMonth() === this.getUTCMonth() &&
          date.getUTCFullYear() === this.getUTCFullYear()
      }, new Date(Date.now()))
      .map((date, _, dates) => ({
        date: date,
        day: date.getUTCDay() || 7,
        dayofmonth: date.getUTCDate(),
        month: date.getUTCMonth() + 1,
        weekofmonth: (((dates[0].getUTCDay() || 7) - 2 + date.getUTCDate()) / 7 | 0) + 1
      }))
    let { results: periodicJobs } = await (
      await fetch(`/api/v2/projects/${this.projectId}/periodicjobs`)
    ).json()
    periodicJobs = periodicJobs
      .filter(periodicJob => !periodicJob.disabled)
      .flatMap(periodicJob =>
        periodicJob.spiders.map(spider => {
          periodicJob.spider_name = spider.name
          delete periodicJob.spider
          delete periodicJob.spiders
          return periodicJob
        })
      )
    return calendar.flatMap(date => {
      const schedule = periodicJobs
        .filter(periodicJob =>
          (periodicJob.month === '*' || +periodicJob.month === date.month) &&
          (periodicJob.day === '*' || +periodicJob.day === date.day) &&
          (periodicJob.dayofmonth === '*' || +periodicJob.dayofmonth === date.dayofmonth)
        )
        .map(periodicJob => ({ ...periodicJob, ...date, periodicjob: 1 }))
      return schedule.length ? schedule : { ...date, periodicjob: 0 }
    }).sort((a, b) =>
      a.dayofmonth - b.dayofmonth || a.spider_name.localeCompare(b.spider_name)
    )
  }

  async render () {
    const schedule = await this.schedule
    const title = new Date(Date.now()).toLocaleString(
      window.navigator.language, { month: 'long', year: 'numeric' }
    )
    const vega = {
      $schema: 'https://vega.github.io/schema/vega-lite/v4.0.2.json',
      config: {
        legend: {
          orient: 'left'
        },
        view: {
          continuousHeight: 300,
          continuousWidth: 400,
          stroke: 'transparent'
        }
      },
      data: {
        name: 'schedule'
      },
      datasets: {
        schedule: schedule
      },
      layer: [
        {
          encoding: {
            color: {
              aggregate: 'sum',
              field: 'periodicjob',
              scale: {
                scheme: 'lightgreyred'
              },
              title: 'Jobs',
              type: 'quantitative'
            },
            tooltip: [
              {
                aggregate: 'sum',
                field: 'periodicjob',
                title: 'Jobs',
                type: 'quantitative'
              }
            ],
            x: {
              axis: null,
              field: 'day',
              type: 'ordinal'
            },
            y: {
              axis: null,
              field: 'weekofmonth',
              type: 'ordinal'
            }
          },
          height: 600,
          mark: {
            cornerRadius: 5,
            height: 95,
            type: 'rect',
            width: 95
          },
          title: title,
          width: 700
        },
        {
          encoding: {
            text: {
              field: 'dayofmonth',
              type: 'ordinal'
            },
            tooltip: [
              {
                aggregate: 'sum',
                field: 'periodicjob',
                title: 'Jobs',
                type: 'quantitative'
              }
            ],
            x: {
              axis: null,
              field: 'day',
              type: 'ordinal'
            },
            y: {
              axis: null,
              field: 'weekofmonth',
              type: 'ordinal'
            }
          },
          height: 600,
          mark: {
            color: 'white',
            fontSize: 50,
            type: 'text'
          },
          width: 700
        }
      ]
    }
    this.innerHTML = `
      <div class="panel" id="dash-next-periodic-jobs" style="padding-top:12px;">
        <div></div>
      </div>
    `
    this.appendChild(
      Object.assign(document.createElement('script'), {
        innerHTML: `vegaEmbed('#dash-next-periodic-jobs>div',${(JSON.stringify(vega))})`
      })
    )
  }
}

window.customElements.define('dash-next-periodic-jobs', PeriodicJobs)
