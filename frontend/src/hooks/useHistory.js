import { useSyncExternalStore } from 'react'
import { subscribe, getHistory } from '../services/history.js'

export default function useHistory() {
  return useSyncExternalStore(subscribe, getHistory)
}
