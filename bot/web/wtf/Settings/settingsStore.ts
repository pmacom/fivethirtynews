import { createStore } from "zustand-x";

interface SettingsStoreState {
  isTrackingAudio: boolean
  isPlayingContentAudio: boolean
  isAudioReactivityEnabled: boolean,
  isMobile: boolean,
  isTablet: boolean,
  isDesktop: boolean,
  isFreeLook: boolean,
  isShowStats: boolean,

  showAudioSettings: boolean
  showSettings: boolean
  showLeva: boolean
  useKeyboard: boolean
}

export enum SettingModes {
  NULL = 'null',
  SETTINGS = 'settings',
  AUDIO = 'audio'
}

export const SettingStore = createStore<SettingsStoreState>({
  isTrackingAudio: false,
  isPlayingContentAudio: false,
  isAudioReactivityEnabled: true,
  isMobile: false,
  isTablet: false,
  isDesktop: false,
  isFreeLook: false,
  isShowStats: false,
  showAudioSettings: false,
  showSettings: false,
  showLeva: false,

  useKeyboard: false
}, {
  name: 'wtf-setting-store',
  persist: { enabled: true }
}).extendActions(({}) => ({

}))

export default SettingStore
