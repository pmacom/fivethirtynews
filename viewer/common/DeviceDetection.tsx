import { useEffect, useState } from "react"
import useSettingStore from '../ui/settings/store'

export const DeviceDetection = () => {
    const isMobile = useSettingStore(state => state.isMobile)

    useEffect(() => {
        
    }, [])

    return null
}