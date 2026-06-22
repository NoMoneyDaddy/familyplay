import * as Notifications from 'expo-notifications'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { create } from 'zustand'
import { clampHour, DEFAULT_REMINDER_HOUR, pickReminderBody } from './reminder-pure'

// 每日本地陪伴提醒：在裝置上排程一則每日通知（不需後端、不送任何資料）。
// 偏好（開關 + 時間）存在 SecureStore；實際排程用 expo-notifications。所有原生呼叫都包 try/catch，
// 失敗（權限被拒、平台不支援）只回 false、不讓畫面崩。
const KEY = 'familyplay.reminder'
const CHANNEL_ID = 'daily-reminder'
const TITLE = 'FamilyPlay'

interface ReminderPref {
  enabled: boolean
  hour: number
}

function parsePref(raw: string | null | undefined): ReminderPref {
  if (!raw) return { enabled: false, hour: DEFAULT_REMINDER_HOUR }
  try {
    const o = JSON.parse(raw) as Partial<ReminderPref>
    return { enabled: o.enabled === true, hour: clampHour(o.hour) }
  } catch {
    return { enabled: false, hour: DEFAULT_REMINDER_HOUR }
  }
}

// 取消所有已排程的每日提醒（重設前先清，避免重複堆疊）。
async function cancelScheduled(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync()
  } catch {
    // 忽略：沒有排程或平台不支援
  }
}

// 排一則每日提醒。回傳是否成功（含權限取得）。
async function scheduleDaily(hour: number): Promise<boolean> {
  try {
    const settings = await Notifications.getPermissionsAsync()
    let granted = settings.granted
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync()
      granted = req.granted
    }
    if (!granted) return false

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: '每日陪伴提醒',
        importance: Notifications.AndroidImportance.DEFAULT,
      })
    }

    await cancelScheduled()
    const dayIndex = Math.floor(Date.now() / 86_400_000)
    await Notifications.scheduleNotificationAsync({
      content: { title: TITLE, body: pickReminderBody(dayIndex) },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: clampHour(hour),
        minute: 0,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    })
    return true
  } catch {
    return false
  }
}

interface ReminderStore {
  enabled: boolean
  hour: number
  hydrated: boolean
  busy: boolean
  hydrate: () => Promise<void>
  /** 開啟提醒（要權限、排程）。回傳是否成功。 */
  enable: (hour: number) => Promise<boolean>
  /** 已開啟時改時間（重新排程）。 */
  setHour: (hour: number) => Promise<boolean>
  /** 關閉並取消排程。 */
  disable: () => Promise<void>
  /** App 啟動時呼叫：還原偏好，若已開啟就重新排程（更新當日文案、補回被系統清掉的排程）。 */
  rearm: () => Promise<void>
}

async function persist(pref: ReminderPref): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(pref))
  } catch {}
}

export const useReminderStore = create<ReminderStore>((set, get) => ({
  enabled: false,
  hour: DEFAULT_REMINDER_HOUR,
  hydrated: false,
  busy: false,
  hydrate: async () => {
    try {
      const pref = parsePref(await SecureStore.getItemAsync(KEY))
      set({ enabled: pref.enabled, hour: pref.hour, hydrated: true })
    } catch {
      set({ hydrated: true })
    }
  },
  enable: async (hour) => {
    if (get().busy) return false
    set({ busy: true })
    const h = clampHour(hour)
    const ok = await scheduleDaily(h)
    if (ok) {
      set({ enabled: true, hour: h })
      await persist({ enabled: true, hour: h })
    }
    set({ busy: false })
    return ok
  },
  setHour: async (hour) => {
    if (get().busy) return false
    set({ busy: true })
    const h = clampHour(hour)
    const ok = await scheduleDaily(h)
    if (ok) {
      set({ enabled: true, hour: h })
      await persist({ enabled: true, hour: h })
    }
    set({ busy: false })
    return ok
  },
  disable: async () => {
    set({ busy: true })
    await cancelScheduled()
    set({ enabled: false, busy: false })
    await persist({ enabled: false, hour: get().hour })
  },
  rearm: async () => {
    const pref = parsePref(await SecureStore.getItemAsync(KEY).catch(() => null))
    set({ enabled: pref.enabled, hour: pref.hour, hydrated: true })
    // 已開啟才重排（scheduleDaily 內會先取消再排，不會重複堆疊）。靜默：失敗不影響啟動。
    if (pref.enabled) await scheduleDaily(pref.hour)
  },
}))
