import axios from 'axios'
import { createScheduledAdapter } from './requestScheduler'

export const API_BASE_URL = '/api'

export interface ApiResponse<T> {
  success: boolean
  code: string
  message: string
  data: T
}

export type ApiRecord = Record<string, unknown>

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  adapter: createScheduledAdapter(axios.getAdapter(axios.defaults.adapter)),
})

export default http
