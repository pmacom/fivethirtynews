import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

import useAudioStore from '../store';
import { Label } from '@/components/ui/label';

export const AudioDeviceSelector: React.FC = () => {
  const audioDevices = useAudioStore(state => state.audioDevices); // Get available audio devices
  const isSetup = useAudioStore(state => state.isAudioStreamSetup);
  const [selectedDevice, setSelectedDevice] = useState<string>(''); // Track selected device
  const [loopbackDeviceId, setLoopbackDeviceId] = useState<string | null>(null);
  const [macbookproDeviceId, setMacbookproDeviceId] = useState<string | null>(null);
  const [showAllDevices, setShowAllDevices] = useState(false);

  const setupAudio = useAudioStore(state => state.setupAudio);
  const stopAudio = useAudioStore(state => state.stopAudioStream);
  const listAudioDevices = useAudioStore(state => state.listAudioDevices);

  useEffect(() => {
    listAudioDevices(); // Fetch the available audio devices
  }, [listAudioDevices]);

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDevice(deviceId); // Update the selected device in the component state
    useAudioStore.setState({ deviceId }); // Also set the deviceId in the store
    console.log('Device selected:', deviceId); // Log the selected deviceId
  };

  const startAudio = () => {
    if (!isSetup && selectedDevice) {
      setupAudio(); // Pass the selected device to setupAudio
    }
  }

  useEffect(() => {
    console.log({ audioDevices });
    const loopBackId = audioDevices.find(device => device.label.toLowerCase().includes('loopback audio (virtual)'))?.deviceId;
    const macProMicId = audioDevices.find(device => device.label.toLowerCase().includes('microphone'))?.deviceId;
    if(loopBackId) setLoopbackDeviceId(loopBackId);
    if(macProMicId) setMacbookproDeviceId(macProMicId);
  }, [audioDevices])

  const connect = (deviceId: string) => {
    useAudioStore.setState({ deviceId })
    setupAudio();
  }

  const deviceSelector = (
    <div className="">
      <Select onValueChange={handleDeviceChange} value={selectedDevice}>
        <SelectTrigger className="">
          {selectedDevice
            ? audioDevices.find(device => device.deviceId === selectedDevice)?.label ||
              'Unnamed Device'
            : 'Select a device'}
        </SelectTrigger>
        <SelectContent>
          {audioDevices.map((device, index) => (
            <SelectItem key={`${device.deviceId}-${index}`} value={device.deviceId}>
              {device.label || 'Unnamed Device'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  const classes = cn({
    'border-2': true
  })

  return (
    <div className={classes}>
      <Label htmlFor="audioDeviceSelect">Select Audio Device: </Label>
      
      <div className="p-4 flex gap-2">
        {loopbackDeviceId && <Button onClick={() => connect(loopbackDeviceId)}>Spotify</Button>}
        {macbookproDeviceId && <Button onClick={() => connect(macbookproDeviceId)}>Microphone</Button>}

        <div className="flex items-center space-x-2 text-white">
          <Checkbox
            id="devices"
            checked={showAllDevices}
            onCheckedChange={() => setShowAllDevices(!showAllDevices)}
          />
          <label
            htmlFor="devices"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Show All
          </label>
        </div>
      </div>

      {showAllDevices && deviceSelector}
    </div>
  );
};

export default AudioDeviceSelector;
