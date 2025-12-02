import { useCallback, useEffect, useState } from "react";
import { Separator } from '@/components/ui/separator';
import { Button } from "@/components/ui/button";
import SettingGroup from "../Settings/components/SettingGroup";
import SubSettingGroup from "../Settings/components/SubSettingGroup";
import BasicCheckbox from "../Settings/components/BasicCheckbox";
import BasicToggle from "../Settings/components/BasicToggle";

import AudioStore from './audioStore';
import SettingStore from "../Settings/settingsStore";
import { useStoreValue } from 'zustand-x';

export const AudioSettings = () => {
  const isAudioReactivityEnabled = useStoreValue(SettingStore, 'isAudioReactivityEnabled');
  const onPrimaryToggleChange = () => SettingStore.set('isAudioReactivityEnabled', !isAudioReactivityEnabled);

  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const audioDevices = useStoreValue(AudioStore, 'audioDevices');
  const [showAll, setShowAll] = useState(false);
  const selectedDeviceId = useStoreValue(AudioStore, 'selectedDeviceId');
  const connectionStatus = useStoreValue(AudioStore, 'connectionStatus');

  const connectToDevice = useCallback(async (deviceId: string) => {
    await AudioStore.set('connectToDevice', deviceId);
  }, []);

  const disconnectDevice = useCallback(() => {
    AudioStore.set('stopAudioStream');
  }, []);

  useEffect(() => {
    AudioStore.set('listAudioDevices');
  }, []);

  return (
    <SettingGroup title="Audio" description="Settings for audio playback.">
      <BasicToggle
        slug="audio-responsive"
        checked={isAudioReactivityEnabled}
        label="Audio Responsive"
        onChange={onPrimaryToggleChange}
      />

      {isAudioReactivityEnabled && (
        <SubSettingGroup title="Selected Device" description="">
          <div className="px-2 w-full">
            <div className="flex flex-wrap gap-2 w-full overflow-scroll h-[50%]">
              {audioDevices.map((device, index) => (
                <Button
                  key={`${device.deviceId}-${index}`}
                  size={"sm"}
                  className={`${selectedDeviceId === device.deviceId ? 'bg-blue-500' : ''}`}
                  onClick={() => connectToDevice(device.deviceId)}
                >
                  {device.label}
                </Button>
              ))}
            </div>
          </div>

          <Separator className="m-0 p-0" />

          <div className="mt-2 text-sm text-gray-600">
            {connectionStatus}
          </div>

          <Button onClick={disconnectDevice} disabled={!selectedDeviceId}>
            Disconnect
          </Button>

          <BasicCheckbox
            label='Show All Devices'
            slug="devices"
            checked={showAll}
            onChange={() => setShowAll(!showAll)}
          />
        </SubSettingGroup>
      )}
    </SettingGroup>
  )
}

const AdvancedAudioSettings = () => {
  return (
    <>
    </>
  )
}

export default AudioSettings