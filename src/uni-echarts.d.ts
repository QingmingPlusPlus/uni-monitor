declare module "uni-echarts" {
  import type { DefineComponent } from "vue"

  type AutoResizeOptions = {
    readonly throttle?: number
    readonly onResize?: () => void
  }

  type UniEchartsProps = {
    readonly option?: unknown
    readonly initOptions?: unknown
    readonly updateOptions?: unknown
    readonly autoresize?: boolean | AutoResizeOptions
    readonly supportHover?: boolean
    readonly initDelay?: number
    readonly class?: string
  }

  const UniEcharts: DefineComponent<UniEchartsProps>

  export default UniEcharts
}

declare module "uni-echarts/shared" {
  import type * as EchartsNamespace from "echarts"

  export function provideEcharts(echartsModule: typeof EchartsNamespace): void
}
