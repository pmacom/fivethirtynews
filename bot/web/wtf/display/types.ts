import { LiveViewContent, LiveViewContentBlock } from "@/wtf/Content/types";

export type DisplayContentTemplateComponent = React.FC<{
  content: LiveViewContent,
  managed?: boolean,
  transform: {
    position: [number, number, number],
    rotation: [number, number, number],
  }
}>

export type DisplayContentTransformFunction = (contents: LiveViewContentBlock[] | undefined) => DisplayContentTransform[]

export type DisplayContentTransform = {
  position: [number, number, number];
  rotation: [number, number, number];
}
