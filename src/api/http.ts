import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export interface ApiResponse<T> {
  success: boolean
  code: string
  message: string
  data: T
}

export type ApiRecord = Record<string, unknown>

export const http = axios.create({
  baseURL: API_BASE_URL,
})

export default http
