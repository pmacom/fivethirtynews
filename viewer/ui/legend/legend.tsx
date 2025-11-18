import React from 'react'
import LegendCategories from './components/LegendCategories'
import LegendItems from './components/LegendItems'
import { useContentStore } from '../../core/store/contentStore'
import './styles.css'

interface LegendProps {

}
function Legend({ }:LegendProps) {
  const content = useContentStore(state => state.content)

  return content.length ? (
    <div className="legend">
      <LegendCategories />
      <LegendItems />
    </div>
  ): null
}

export default Legend