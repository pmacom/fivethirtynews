import React from 'react';
import { createStore, useStoreValue } from 'zustand-x';
import { applyAndAdjustGain, roundFloat, safeFrequencyData, getFrequencyRanges } from './utils/audioUtils';
import { useFrame } from '@react-three/fiber';
import SettingStore from "../Settings/settingsStore";

/*
// Step 1: Add the AudioStreamListener once in your project somewhere
// Step 2: Add the WTFAudioStore to your component and listen for things

  const low = WTFAudioStore.use.low()
  const mid = WTFAudioStore.use.mid()
  const high = WTFAudioStore.use.high()
  const amplitude = WTFAudioStore.use.amplitude()

// Step 3: Attach those values to a material and play some audio in your browser 
*/

enum AudioConnectionStatus {
  DISCONNECTED = 'Disconnected',
  CONNECTING = 'Connecting...',
  CONNECTED = 'Connected',
  FAILED = 'Failed to connect',
}

interface AudioStoreState {
  deviceId: string;
  audioDevices: MediaDeviceInfo[];
  isAudioStreamSetup: boolean;
  audioContext: AudioContext | null;
  analyserNode: AnalyserNode | null;
  audioStream: MediaStream | null;

  selectedDeviceId: string | null;
  connectionStatus: AudioConnectionStatus;

  isStreamActive: boolean;
  isAnalyserReady: boolean;

  frequencyData: Float32Array;
  low: number;
  mid: number;
  high: number;
  lowGain: number;
  midGain: number;
  highGain: number;
  amplitude: number;
  rawAmplitude: number;
}


export const AudioStore = createStore<AudioStoreState>({
  deviceId: '',
  audioDevices: [],
  isAudioStreamSetup: false,
  audioContext: null,
  audioStream: null,
  analyserNode: null,
  isStreamActive: false,
  isAnalyserReady: false,

  selectedDeviceId: null,
  connectionStatus: AudioConnectionStatus.DISCONNECTED,

  frequencyData: new Float32Array(),
  low: 0,
  mid: 0,
  high: 0,
  lowGain: 1.6,
  midGain: 1.6,
  highGain: 3,
  amplitude: 0,
  rawAmplitude: 0,
}, {
  name: 'wtf-audio-store'
}).extendActions(({ set, get }) => ({
  setupAudio: async () => {

    const deviceId = get('deviceId');
    const isAudioStreamSetup = get('isAudioStreamSetup')

    if(deviceId.length === 0) return console.log('No audio device selected.');
    if(isAudioStreamSetup) return console.log('Audio already setup.');

    try {
      console.log('Requesting user media with deviceId:', deviceId);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
      });

      const audioContext = new AudioContext();
      console.log('AudioContext created:', audioContext);

      const analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 512;
      console.log('AnalyserNode created with fftSize:', analyserNode.fftSize);

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyserNode);
      console.log('MediaStreamSource connected to AnalyserNode');

      set('audioContext', audioContext);
      set('analyserNode', analyserNode);
      set('isAudioStreamSetup', true);
      set('audioStream', stream);
      set('isStreamActive', true);
      set('isAnalyserReady', true);
      console.log('Audio setup complete.');
    } catch (error) {
      console.error('Error setting up audio:', error);
    }
  },

  stopAudioStream: () => {
    if (SettingStore.get('isAudioReactivityEnabled')) return;

    const audioStream = get('audioStream');
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      set('audioStream', null);
      set('isStreamActive', false);
      set('isAudioStreamSetup', false);
      set('audioContext', null);
      set('analyserNode', null);
      set('isAnalyserReady', false);
      console.log('Audio stream stopped and resources cleared.');
    }
  },

  toggleAudioStream: () => {
    if (SettingStore.get('isAudioReactivityEnabled')) return;

    const isStreamActive = get('isStreamActive');
    const audioStream = get('audioStream');
    if (isStreamActive && audioStream) {
      audioStream.getTracks().forEach(track => track.enabled = false);
      set('isStreamActive', false);
      console.log('Audio stream paused.');
    } else if (audioStream) {
      audioStream.getTracks().forEach(track => track.enabled = true);
      set('isStreamActive', true);
      console.log('Audio stream resumed.');
    } else {
      console.warn('No audio stream available to toggle.');
    }
  },


  listAudioDevices: async () => {
    if (SettingStore.get('isAudioReactivityEnabled')) return;

    try {
      console.log('Requesting audio device permissions.');
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter(
        device => device.kind === 'audioinput' || device.kind === 'audiooutput'
      );

      console.log('Available audio devices:', audioDevices);
      set('audioDevices', audioDevices);
    } catch (error: any) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        console.error('Permission to access audio devices was denied.');
      } else {
        console.error('Error fetching audio devices:', error);
      }
    }
  },

  updateFrequencies: () => {
    if (SettingStore.get('isAudioReactivityEnabled')) return;

    if (!get('isAnalyserReady')) { console.warn('AnalyserNode is not ready.'); return;}
    AudioStore.set('getRawFrequencyData');
    AudioStore.set('normalizeFrequencyData');
  },

  getRawFrequencyData: () => {
    if (SettingStore.get('isAudioReactivityEnabled')) return;

    const analyserNode = get('analyserNode');
    if (!analyserNode || !get('isAnalyserReady')) { console.warn('AnalyserNode is not ready.'); return;}
    const bufferLength = analyserNode.frequencyBinCount;
    const _frequencyData = new Float32Array(bufferLength);
    analyserNode.getFloatFrequencyData(_frequencyData);
    const frequencyData = safeFrequencyData(_frequencyData);
    set('frequencyData', frequencyData);
  },

  normalizeFrequencyData: () => {
    if (SettingStore.get('isAudioReactivityEnabled')) return;

    const frequencyData = get('frequencyData')
    const fftSize = frequencyData.length * 2
    // @ts-expect-error @ts-ignore
    const { low, mid, high } = getFrequencyRanges(frequencyData, fftSize)
    const lowGain = get('lowGain')
    const midGain = get('midGain')
    const highGain = get('highGain')
    const { value: lowValue, gain: newLowGain } = applyAndAdjustGain(low, lowGain)
    const { value: midValue, gain: newMidGain } = applyAndAdjustGain(mid, midGain)
    const { value: highValue, gain: newHighGain } = applyAndAdjustGain(high, highGain)
    const rawAmplitude = (lowValue + midValue + highValue) / 3
    const amplitude = Math.max(rawAmplitude, .1) + 1

    set('low', roundFloat(lowValue));
    set('mid', roundFloat(midValue));
    set('high', roundFloat(highValue));
    set('lowGain', newLowGain);
    set('midGain', newMidGain);
    set('highGain', newHighGain);
    set('amplitude', roundFloat(amplitude));
    set('rawAmplitude', roundFloat(rawAmplitude));
  },

  connectToDevice: async (deviceId: string) => {
    set('connectionStatus', AudioConnectionStatus.CONNECTING);
    try {
      set('deviceId', deviceId);
      await AudioStore.set('setupAudio');
      set('selectedDeviceId', deviceId);
      set('connectionStatus', AudioConnectionStatus.CONNECTED);
    } catch (error) {
      set('connectionStatus', AudioConnectionStatus.FAILED);
      console.error('Error connecting to device:', error);
    }
  },

}));


export const AudioStreamListener = () => {
  const isAnalyserReady = useStoreValue(AudioStore, 'isAnalyserReady')

  useFrame(() => {
    if(!isAnalyserReady) return
    AudioStore.set('updateFrequencies')
  })
  return <></>
}


export default AudioStore