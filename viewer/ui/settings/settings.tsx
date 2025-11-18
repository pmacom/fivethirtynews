import React, { useCallback } from 'react'
import { CiSettings } from "react-icons/ci";
import { IoMdClose } from "react-icons/io";
import { Label } from '@/components/ui/label';
import useSettingStore from './store';
import "./styles.css"

import {
  Drawer,
  DrawerContent,
  DrawerTitle,
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
            <div className="flex flex-col text-slate-300">

              <div className="font-bold px-6 pt-4 pb-4 flex justify-between items-center flex-shrink-0 border-b border-slate-700">
                <DrawerTitle className="text-2xl">Settings</DrawerTitle>
                <div
                  className="flex items-center space-x-2 text-2xl cursor-pointer hover:text-white transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <Label className="cursor-pointer">Close</Label>
                  <IoMdClose />
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                {children}
              </div>

            </div>
          </DrawerContent>
        </Drawer>

    </div>
  )
}

export default Settings