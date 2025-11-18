import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

interface BasicCheckboxProps {
  /**
   * A unique identifier for the toggle switch. ex: `simple-mode`
   */
  slug: string,
  label: string,
  checked: boolean
  onChange?: (checked: boolean) => void
}

export const BasicCheckbox = ({ slug, checked, label, onChange }:BasicCheckboxProps) => {
  return (
    <div className="flex items-center pr-2 space-x-2">
      <Label className="pr-1" htmlFor={slug}>{label}</Label>
      <Checkbox
        id={slug}
        checked={checked}
        onCheckedChange={onChange}
      />
    </div>
  )
}

export default BasicCheckbox