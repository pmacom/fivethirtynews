import React from 'react'
import LegendCategories from './components/LegendCategories'
import LegendItems from './components/LegendItems'
import { ContentStore } from "../Content/contentStore"
import './styles.css'
import { useStoreValue } from 'zustand-x'

function Legend() {
  const content = useStoreValue(ContentStore, 'content')

  return content.length ? (
    <div className="legend">
      <LegendCategories />
      <LegendItems />
    </div>
  ): null
}

export default Legend