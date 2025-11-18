import { useCallback, useEffect, useState } from "react";
import { Separator } from '@/components/ui/separator';
import { Button } from "@/components/ui/button";
import SettingGroup from '../ui/settings/components/SettingGroup';
import SubSettingGroup from '../ui/settings/components/SubSettingGroup';
import BasicCheckbox from '../ui/settings/components/BasicCheckbox';
import BasicToggle from '../ui/settings/components/BasicToggle';

import useAudioStore from './store';
import useSettingStore from "../ui/settings/store";

export const AudioSettings = () => {
  const isAudioReactivityEnabled = useSettingStore(state => state.isAudioReactivityEnabled);
  const onPrimaryToggleChange = () => useSettingStore.setState({ isAudioReactivityEnabled: !isAudioReactivityEnabled });

  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const audioDevices = useAudioStore(state => state.audioDevices);
  const [showAll, setShowAll] = useState(false);
  const selectedDeviceId = useAudioStore(state => state.selectedDeviceId);
  const connectionStatus = useAudioStore(state => state.connectionStatus);
  const connectToDevice = useAudioStore(state => state.connectToDevice);
  const stopAudioStream = useAudioStore(state => state.stopAudioStream);
  const listAudioDevices = useAudioStore(state => state.listAudioDevices);

  const handleConnectToDevice = useCallback(async (deviceId: string) => {
    await connectToDevice(deviceId);
  }, [connectToDevice]);

  const disconnectDevice = useCallback(() => {
    stopAudioStream();
  }, [stopAudioStream]);

  useEffect(() => {
    listAudioDevices();
  }, [listAudioDevices]);

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
                  onClick={() => handleConnectToDevice(device.deviceId)}
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