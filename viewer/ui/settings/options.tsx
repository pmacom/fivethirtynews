import { useCallback, useEffect, useState } from "react";
import { Separator } from '@/components/ui/separator';
import { Button } from "@/components/ui/button";
import SettingGroup from '../settings/components/SettingGroup';
import SubSettingGroup from '../settings/components/SubSettingGroup';
import BasicCheckbox from '../settings/components/BasicCheckbox';
import BasicToggle from '../settings/components/BasicToggle';

import useSettingStore from "../settings/store";

export const SettingsOptions = () => {
  const useKeyboard = useSettingStore(state => state.useKeyboard)
  const onPrimaryToggleChange = () => useSettingStore.setState({ useKeyboard: !useKeyboard })

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
  const isFreeLook = useSettingStore(state => state.isFreeLook)
  const onPrimaryToggleChange = () => useSettingStore.setState({ isFreeLook: !isFreeLook })

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
  const showLeva = useSettingStore(state => state.showLeva)
  const onPrimaryToggleChange = () => useSettingStore.setState({ showLeva: !showLeva })

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