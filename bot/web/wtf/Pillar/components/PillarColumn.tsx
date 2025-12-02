import { LiveViewContentBlock } from "@/wtf/Content/types"
import { PillarColumnItem } from "./PillarColumnItem"

// Define the props interface for the PillarColumn component
interface WTFColumnProps {
  data: LiveViewContentBlock
  position: [number, number, number]
  rotation: [number, number, number]
}

// PillarColumn component: Renders a group of PillarColumnItems
export const PillarColumn = ({ data, position, rotation }: WTFColumnProps) => {
  return (
    // Create a group with specified position and rotation
    <group position={position} rotation={rotation}>
      {/* Map through content_block_items and render a PillarColumnItem for each */}
      {data.content_block_items.map((item: any, i: number) => (
        <PillarColumnItem
          key={'pillar-column-item-' + i} // Unique key for each item
          data={item} // Pass item data to PillarColumnItem
          itemIndex={i} // Pass the index of the item
          categoryId={data.id} // Pass the category ID
          position={[0, i, 0]} // Set position based on index (vertically stacked)
        />
      ))}
    </group>
  )
}

export default PillarColumn