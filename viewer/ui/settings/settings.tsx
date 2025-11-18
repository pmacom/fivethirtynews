import React, { useCallback } from 'react'
import { CiSettings } from "react-icons/ci";
import { IoMdClose } from "react-icons/io";
import { Label } from '@/components/ui/label';
import useSettingStore from './store';
import "./styles.css"

import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer"

interface SettingsProps {
  children?: React.ReactNode
}

export const Settings = ({ children }:SettingsProps) => {
  const showSettings = useSettingStore(state => state.showSettings)

  const onClick = useCallback(() => {
    useSettingStore.setState({ showSettings: !showSettings })
  }, [showSettings])

  const setIsOpen = useCallback((isOpen: boolean) => useSettingStore.setState({ showSettings: isOpen }), [])

  return (
    <div className="wtf--ui cursor-pointer z-[103]">

      <div onClick={onClick} className="wtf--ui--container rounded fixed bottom-0 right-0'">
        <CiSettings />
      </div>
  
        <Drawer open={showSettings} defaultOpen onClose={() => setIsOpen(false)}>
          <DrawerContent className='dark'>
            <div className="p-4 pb-10 flex flex-col gap-2 text-slate-300">

              <div className="font-bold pl-4  pb-5 flex justify-between items-center">
                <div className="text-2xl">Settings</div>
                <div className="flex items-center space-x-2 text-2xl mr-4">
                  <Label>Close</Label>
                  <IoMdClose />
                </div>
              </div>

              {children}

            </div>
          </DrawerContent>
        </Drawer>

    </div>
  )
}

export default Settings