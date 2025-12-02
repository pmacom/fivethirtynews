import { createStore } from "zustand-x";
import { DisplayContentTransform, DisplayContentTransformFunction } from "./types";
// import { DisplayContentPositions_Pillar } from "./transforms/PillarTransform";
import ContentStore from "../Content/contentStore";
// import { DisplayTransforms, DisplayTransformsOptions } from "./transforms/DisplayTransforms";

// TODO: Restore transforms when needed
enum DisplayTransformsOptions {
  PILLAR = 'pillar'
}

const DisplayTransforms: any = {
  pillar: () => []
};

interface PositionStoreState {
  transforms: DisplayContentTransform[]
  transformFunction: DisplayTransformsOptions
}

export const PositionStore = createStore<PositionStoreState>({
  transforms: [],
  transformFunction: DisplayTransformsOptions.PILLAR
}, {
  name: 'spatial-data-store'
}).extendActions(({ set, get }) => ({
  init: () => {
    const content = ContentStore.get('content')
    const transformFunction = get('transformFunction')
    const transforms = DisplayTransforms[transformFunction](content)
    set('transforms', transforms)
  },
  nextTransformFunction: () => {
    const currentTransformFunction = get('transformFunction');
    const transformOptions = Object.values(DisplayTransformsOptions);
    const currentIndex = transformOptions.indexOf(currentTransformFunction);
    const nextIndex = (currentIndex + 1) % transformOptions.length;
    const nextTransformFunction = transformOptions[nextIndex];
    set('transformFunction', nextTransformFunction);
    PositionStore.set('init')
  },
  previousTransformFunction: () => {
    const currentTransformFunction = get('transformFunction');
    const transformOptions = Object.values(DisplayTransformsOptions);
    const currentIndex = transformOptions.indexOf(currentTransformFunction);
    const previousIndex = (currentIndex - 1 + transformOptions.length) % transformOptions.length;
    const previousTransformFunction = transformOptions[previousIndex];
    set('transformFunction', previousTransformFunction);
    PositionStore.set('init')
  },
}))

ContentStore.store.subscribe((state, prevState) => {
  if(state.content !== prevState.content) {
    PositionStore.set('init')
  }
})

export default PositionStore
