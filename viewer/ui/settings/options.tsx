import { useCallback, useEffect, useState } from "react";
import { Separator } from '@/components/ui/separator';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import SettingGroup from '../settings/components/SettingGroup';
import SubSettingGroup from '../settings/components/SubSettingGroup';
import BasicCheckbox from '../settings/components/BasicCheckbox';
import BasicToggle from '../settings/components/BasicToggle';

import useSettingStore from "../settings/store";
import useAudioStore from "../../audio/store";

export const SettingsOptions = () => {
  // Controls
  const useKeyboard = useSettingStore(state => state.useKeyboard)

  // Camera
  const isFreeLook = useSettingStore(state => state.isFreeLook)

  // Audio
  const isTrackingAudio = useSettingStore(state => state.isTrackingAudio)
  const isPlayingContentAudio = useSettingStore(state => state.isPlayingContentAudio)
  const isAudioReactivityEnabled = useSettingStore(state => state.isAudioReactivityEnabled)

  // Audio Device Management
  const audioDevices = useAudioStore(state => state.audioDevices)
  const selectedDeviceId = useAudioStore(state => state.selectedDeviceId)
  const connectionStatus = useAudioStore(state => state.connectionStatus)
  const connectToDevice = useAudioStore(state => state.connectToDevice)
  const stopAudioStream = useAudioStore(state => state.stopAudioStream)
  const listAudioDevices = useAudioStore(state => state.listAudioDevices)

  // Developer Tools
  const showLeva = useSettingStore(state => state.showLeva)
  const isShowStats = useSettingStore(state => state.isShowStats)

  const handleConnectToDevice = useCallback(async (deviceId: string) => {
    await connectToDevice(deviceId)
  }, [connectToDevice])

  const disconnectDevice = useCallback(() => {
    stopAudioStream()
  }, [stopAudioStream])

  useEffect(() => {
    listAudioDevices()
  }, [listAudioDevices])

  return (
    <Tabs defaultValue="controls" orientation="vertical" className="flex flex-row h-full gap-0">
      <TabsList className="flex-col items-stretch justify-start w-56 h-auto bg-transparent p-0 gap-0 border-r border-slate-700">
        <TabsTrigger
          value="controls"
          className="justify-start rounded-none border-l-4 border-transparent px-6 py-5 text-base font-medium data-[state=active]:border-blue-500 data-[state=active]:bg-slate-800/50 data-[state=active]:text-white hover:bg-slate-800/30 transition-colors"
        >
          Controls
        </TabsTrigger>
        <TabsTrigger
          value="camera"
          className="justify-start rounded-none border-l-4 border-transparent px-6 py-5 text-base font-medium data-[state=active]:border-blue-500 data-[state=active]:bg-slate-800/50 data-[state=active]:text-white hover:bg-slate-800/30 transition-colors"
        >
          Camera
        </TabsTrigger>
        <TabsTrigger
          value="audio"
          className="justify-start rounded-none border-l-4 border-transparent px-6 py-5 text-base font-medium data-[state=active]:border-blue-500 data-[state=active]:bg-slate-800/50 data-[state=active]:text-white hover:bg-slate-800/30 transition-colors"
        >
          Audio
        </TabsTrigger>
        <TabsTrigger
          value="developer"
          className="justify-start rounded-none border-l-4 border-transparent px-6 py-5 text-base font-medium data-[state=active]:border-blue-500 data-[state=active]:bg-slate-800/50 data-[state=active]:text-white hover:bg-slate-800/30 transition-colors"
        >
          Developer
        </TabsTrigger>
      </TabsList>

      <ScrollArea className="flex-1 h-full">
        <div className="px-8 py-6">
          <TabsContent value="controls" className="mt-0">
            <div className="space-y-6">
              <div>
                <p className="text-sm text-slate-400 mb-4">Navigation and interaction settings</p>
                <BasicToggle
                  slug="controls-keyboard"
                  checked={useKeyboard}
                  label="Keyboard Navigation"
                  onChange={() => useSettingStore.setState({ useKeyboard: !useKeyboard })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="camera" className="mt-0">
            <div className="space-y-6">
              <div>
                <p className="text-sm text-slate-400 mb-4">Camera behavior and movement</p>
                <BasicToggle
                  slug="camera-freelook"
                  checked={isFreeLook}
                  label="Free Look Mode"
                  onChange={() => useSettingStore.setState({ isFreeLook: !isFreeLook })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="audio" className="mt-0">
            <div className="space-y-6">
              <div>
                <p className="text-sm text-slate-400 mb-4">Sound and audio reactivity settings</p>
                <div className="space-y-3">
                  <BasicToggle
                    slug="audio-tracking"
                    checked={isTrackingAudio}
                    label="Track Audio"
                    onChange={() => useSettingStore.setState({ isTrackingAudio: !isTrackingAudio })}
                  />
                  <BasicToggle
                    slug="audio-playback"
                    checked={isPlayingContentAudio}
                    label="Play Content Audio"
                    onChange={() => useSettingStore.setState({ isPlayingContentAudio: !isPlayingContentAudio })}
                  />
                  <BasicToggle
                    slug="audio-reactivity"
                    checked={isAudioReactivityEnabled}
                    label="Audio Reactivity"
                    onChange={() => useSettingStore.setState({ isAudioReactivityEnabled: !isAudioReactivityEnabled })}
                  />
                </div>
              </div>

              {isAudioReactivityEnabled && (
                <div className="border-t border-slate-700 pt-6">
                  <div className="mb-4">
                    <h3 className="text-base font-medium text-slate-200 mb-1">Audio Input Device</h3>
                    <p className="text-xs text-slate-400">Select the microphone or audio input for reactivity</p>
                  </div>

                  <div className="space-y-3">
                    {audioDevices.map((device, index) => (
                      <button
                        key={`${device.deviceId}-${index}`}
                        onClick={() => handleConnectToDevice(device.deviceId)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                          selectedDeviceId === device.deviceId
                            ? 'border-blue-500 bg-blue-500/10 text-white'
                            : 'border-slate-700 bg-slate-800/30 text-slate-300 hover:border-slate-600 hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{device.label || `Device ${index + 1}`}</span>
                          {selectedDeviceId === device.deviceId && (
                            <span className="text-xs text-blue-400">Connected</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {selectedDeviceId && (
                    <div className="mt-4 pt-4 border-t border-slate-700">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-slate-400">
                          Status: <span className="text-green-400">{connectionStatus}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={disconnectDevice}
                          className="text-xs"
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="developer" className="mt-0">
            <div className="space-y-6">
              <div>
                <p className="text-sm text-slate-400 mb-4">Advanced settings and debugging</p>
                <div className="space-y-3">
                  <BasicToggle
                    slug="dev-leva"
                    checked={showLeva}
                    label="Leva Controls"
                    onChange={() => useSettingStore.setState({ showLeva: !showLeva })}
                  />
                  <BasicToggle
                    slug="dev-stats"
                    checked={isShowStats}
                    label="Performance Stats"
                    onChange={() => useSettingStore.setState({ isShowStats: !isShowStats })}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </ScrollArea>
    </Tabs>
  )
}

// Kept for backward compatibility - now uses the main SettingsOptions component
export const CameraOptions = () => {
  const isFreeLook = useSettingStore(state => state.isFreeLook)

  return (
    <SettingGroup title="Camera" description="Camera behavior and movement">
      <BasicToggle
        slug="camera-freelook"
        checked={isFreeLook}
        label="Free Look Mode"
        onChange={() => useSettingStore.setState({ isFreeLook: !isFreeLook })}
      />
    </SettingGroup>
  )
}

// Kept for backward compatibility - now uses the main SettingsOptions component
export const LevaOptions = () => {
  const showLeva = useSettingStore(state => state.showLeva)

  return (
    <SettingGroup title="Developer Tools" description="Advanced settings and debugging">
      <BasicToggle
        slug="show-leva"
        checked={showLeva}
        label="Leva Controls"
        onChange={() => useSettingStore.setState({ showLeva: !showLeva })}
      />
    </SettingGroup>
  )
}

export default SettingsOptions