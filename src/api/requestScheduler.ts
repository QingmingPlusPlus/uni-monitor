import { CanceledError } from 'axios'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'

/** 在启动传输前排队，避免把浏览器连接排队时间算进接口超时。 */
export function createScheduledAdapter(adapter: AxiosAdapter): AxiosAdapter {
  type Job = { config: InternalAxiosRequestConfig; priority: number; start: () => void }
  const queue: Job[] = []
  let active = 0
  let bulkActive = 0

  function drain(): void {
    while (active < 4) {
      // 普通请求最多占三个位置，设备月工时最多占两个；为变化点留出位置。
      const eligible = queue.filter(job => job.priority === 0 || (active < 3 && (job.priority !== 2 || bulkActive < 2)))
      eligible.sort((a, b) => a.priority - b.priority)
      const job = eligible[0]
      if (!job) return
      queue.splice(queue.indexOf(job), 1)
      job.start()
    }
  }

  return config => new Promise((resolve, reject) => {
    const priority = config.url === '/schedule/getChangePoint' ? 0
      : config.url === '/device/availability/month/daily-net' ? 2 : 1
    const cleanup = () => config.signal?.removeEventListener?.('abort', cancel)
    const cancel = () => {
      const index = queue.indexOf(job)
      if (index < 0) return
      queue.splice(index, 1)
      cleanup()
      reject(new CanceledError('请求已取消', config))
      drain()
    }
    const job: Job = {
      config, priority,
      start: () => {
        cleanup()
        active += 1
        if (priority === 2) bulkActive += 1
        Promise.resolve().then(() => adapter(config)).then(resolve, reject).finally(() => {
          active -= 1
          if (priority === 2) bulkActive -= 1
          drain()
        })
      },
    }
    queue.push(job)
    config.signal?.addEventListener?.('abort', cancel)
    if (config.signal?.aborted) cancel()
    else drain()
  })
}
