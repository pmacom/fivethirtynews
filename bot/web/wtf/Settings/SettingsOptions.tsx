import { useCallback, useEffect, useState } from "react";
import { Separator } from '@/components/ui/separator';
import { Button } from "@/components/ui/button";
import SettingGroup from "./components/SettingGroup";
import SubSettingGroup from "./components/SubSettingGroup";
import BasicCheckbox from "./components/BasicCheckbox";
import BasicToggle from "./components/BasicToggle";

import SettingStore from './settingsStore';
import { useStoreValue } from 'zustand-x';

export const SettingsOptions = () => {
  const useKeyboard = useStoreValue(SettingStore, 'useKeyboard')
  const onPrimaryToggleChange = () => SettingStore.set('useKeyboard', !useKeyboard)

  return (
    <SettingGroup title="Controls" description="Use the keyboard to navigate the content.">
      <BasicToggle
        slug="controls-keyboard"
        checked={useKeyboard}
        label="Use Keyboard"
        onChange={onPrimaryToggleChange}
      />
    </SettingGroup>
  )
}

export const CameraOptions = () => {
  const isFreeLook = useStoreValue(SettingStore, 'isFreeLook')
  const onPrimaryToggleChange = () => SettingStore.set('isFreeLook', !isFreeLook)

  return (
    <SettingGroup title="Camera" description="Change camera settings.">
      <BasicToggle
        slug="camera-freelook"
        checked={isFreeLook}
        label="Freelook"
        onChange={onPrimaryToggleChange}
      />
    </SettingGroup>
  )
}

export const LevaOptions = () => {
  const showLeva = useStoreValue(SettingStore, 'showLeva')
  const onPrimaryToggleChange = () => SettingStore.set('showLeva', !showLeva)

  return (
    <SettingGroup title="Camera" description="Change camera settings.">
      <BasicToggle
        slug="show-leva"
        checked={showLeva}
        label="Show Leva"
        onChange={onPrimaryToggleChange}
      />
    </SettingGroup>
  )
}

export default SettingsOptions