'use client'

import React from 'react';
import { create } from 'zustand';
import { applyAndAdjustGain, roundFloat, safeFrequencyData, getFrequencyRanges } from './utils/utils';
import useSettingStore from '../ui/settings/store';

/*
// Step 1: Add the AudioStreamListener once in your project somewhere
// Step 2: Add the useAudioStore hook to your component and listen for things

  const low = useAudioStore(state => state.low)
  const mid = useAudioStore(state => state.mid)
  const high = useAudioStore(state => state.high)
  const amplitude = useAudioStore(state => state.amplitude)

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

interface AudioStoreActions {
  setupAudio: () => Promise<void>;
  stopAudioStream: () => void;
  toggleAudioStream: () => void;
  listAudioDevices: () => Promise<void>;
  updateFrequencies: () => void;
  getRawFrequencyData: () => void;
  normalizeFrequencyData: () => void;
  connectToDevice: (deviceId: string) => Promise<void>;
}

type AudioStore = AudioStoreState & AudioStoreActions;

export const useAudioStore = create<AudioStore>((set, get) => ({
  // Initial state
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

  // Actions
  setupAudio: async () => {
    const { deviceId, isAudioStreamSetup } = get();

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

      set({ 
        audioContext, 
        analyserNode, 
        isAudioStreamSetup: true, 
        audioStream: stream,
        isStreamActive: true,
        isAnalyserReady: true
      });
      console.log('Audio setup complete.');
    } catch (error) {
      console.error('Error setting up audio:', error);
    }
  },

  stopAudioStream: () => {
    if (useSettingStore.getState().isAudioReactivityEnabled) return;

    const { audioStream } = get();
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      set({ 
        audioStream: null, 
        isStreamActive: false,
        isAudioStreamSetup: false,
        audioContext: null,
        analyserNode: null,
        isAnalyserReady: false
      });
      console.log('Audio stream stopped and resources cleared.');
    }
  },

  toggleAudioStream: () => {
    if (useSettingStore.getState().isAudioReactivityEnabled) return;

    const { isStreamActive, audioStream } = get();
    if (isStreamActive && audioStream) {
      audioStream.getTracks().forEach(track => track.enabled = false);
      set({ isStreamActive: false });
      console.log('Audio stream paused.');
    } else if (audioStream) {
      audioStream.getTracks().forEach(track => track.enabled = true);
      set({ isStreamActive: true });
      console.log('Audio stream resumed.');
    } else {
      console.warn('No audio stream available to toggle.');
    }
  },

  listAudioDevices: async () => {
    if (useSettingStore.getState().isAudioReactivityEnabled) return;

    try {
      console.log('Requesting audio device permissions.');
      await navigator.mediaDevices.getUserMedia({ audio: true });
  
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter(
        device => device.kind === 'audioinput' || device.kind === 'audiooutput'
      );
  
      console.log('Available audio devices:', audioDevices);
      set({ audioDevices });
    } catch (error: any) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        console.error('Permission to access audio devices was denied.');
      } else {
        console.error('Error fetching audio devices:', error);
      }
    }
  },

  updateFrequencies: () => {
    if (useSettingStore.getState().isAudioReactivityEnabled) return;

    const { isAnalyserReady } = get();
    if (!isAnalyserReady) { console.warn('AnalyserNode is not ready.'); return;}
    get().getRawFrequencyData();
    get().normalizeFrequencyData();
  },

  getRawFrequencyData: () => {
    if (useSettingStore.getState().isAudioReactivityEnabled) return;

    const { analyserNode, isAnalyserReady } = get();
    if (!analyserNode || !isAnalyserReady) { console.warn('AnalyserNode is not ready.'); return;}
    const bufferLength = analyserNode.frequencyBinCount;
    const _frequencyData = new Float32Array(bufferLength);
    analyserNode.getFloatFrequencyData(_frequencyData);
    const frequencyData = safeFrequencyData(_frequencyData);
    set({ frequencyData });
  },

  normalizeFrequencyData: () => {
    if (useSettingStore.getState().isAudioReactivityEnabled) return;
    
    const { frequencyData, lowGain, midGain, highGain } = get();
    const fftSize = frequencyData.length * 2;
    // @ts-expect-error @ts-ignore
    const { low, mid, high } = getFrequencyRanges(frequencyData, fftSize);
    const { value: lowValue, gain: newLowGain } = applyAndAdjustGain(low, lowGain);
    const { value: midValue, gain: newMidGain } = applyAndAdjustGain(mid, midGain);
    const { value: highValue, gain: newHighGain } = applyAndAdjustGain(high, highGain);
    const rawAmplitude = (lowValue + midValue + highValue) / 3;
    const amplitude = Math.max(rawAmplitude, .1) + 1;

    set({
      low: roundFloat(lowValue),
      mid: roundFloat(midValue),
      high: roundFloat(highValue),
      lowGain: newLowGain,
      midGain: newMidGain,
      highGain: newHighGain,
      amplitude: roundFloat(amplitude),
      rawAmplitude: roundFloat(rawAmplitude),
    });
  },

  connectToDevice: async (deviceId: string) => {
    set({ connectionStatus: AudioConnectionStatus.CONNECTING });
    try {
      set({ deviceId });
      await get().setupAudio();
      set({
        selectedDeviceId: deviceId,
        connectionStatus: AudioConnectionStatus.CONNECTED,
      });
    } catch (error) {
      set({ connectionStatus: AudioConnectionStatus.FAILED });
      console.error('Error connecting to device:', error);
    }
  },
}));


export const AudioStreamListener = () => {
  const { useFrame } = require('@react-three/fiber');
  const isAnalyserReady = useAudioStore(state => state.isAnalyserReady);
  const updateFrequencies = useAudioStore(state => state.updateFrequencies);

  useFrame(() => {
    if(!isAnalyserReady) return;
    updateFrequencies();
  })
  return <></>;
}

export default useAudioStore;