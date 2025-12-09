import * as React from 'react';
import { useFieldControlProps_unstable } from '@fluentui/react-field';
import { getPartitionedNativeProps, slot, useId, useMergedRefs } from '@fluentui/react-utilities';
import { useFocusWithin } from '@fluentui/react-tabster';
import { useRangeSliderState_unstable } from './useRangeSliderState';
import type { RangeSliderProps, RangeSliderState } from './RangeSlider.types';

/**
 * Create the state required to render RangeSlider.
 *
 * The returned state can be modified with hooks such as useRangeSliderStyles_unstable,
 * before being passed to renderRangeSlider_unstable.
 *
 * @param props - props from this instance of RangeSlider
 * @param ref - reference to root HTMLDivElement of RangeSlider
 */
export const useRangeSlider_unstable = (
  props: RangeSliderProps,
  ref: React.Ref<HTMLInputElement>,
): RangeSliderState => {
  props = useFieldControlProps_unstable(props, { supportsLabelFor: false });

  const nativeProps = getPartitionedNativeProps({
    props,
    primarySlotTagName: 'input',
    excludedPropNames: ['onChange', 'size', 'defaultValue', 'value'],
  });

  const { disabled, vertical = false, size = 'medium', root, rail, startThumb, endThumb, startInput, endInput } = props;

  const startInputId = useId('rangeslider-start-', props.id);
  const endInputId = useId('rangeslider-end-', props.id);

  const state: RangeSliderState = {
    disabled,
    size,
    vertical,
    value: { start: 0, end: 0 },
    components: {
      root: 'div',
      rail: 'div',
      startThumb: 'div',
      endThumb: 'div',
      startInput: 'input',
      endInput: 'input',
    },
    root: slot.always(root, {
      defaultProps: nativeProps.root,
      elementType: 'div',
    }),
    rail: slot.always(rail, { elementType: 'div' }),
    startThumb: slot.always(startThumb, { elementType: 'div' }),
    endThumb: slot.always(endThumb, { elementType: 'div' }),
    startInput: slot.always(startInput, {
      defaultProps: {
        id: startInputId,
        type: 'range',
        orient: vertical ? 'vertical' : undefined,
      },
      elementType: 'input',
    }),
    endInput: slot.always(endInput, {
      defaultProps: {
        id: endInputId,
        ref,
        ...nativeProps.primary,
        type: 'range',
        orient: vertical ? 'vertical' : undefined,
      },
      elementType: 'input',
    }),
  };

  state.startThumb.ref = useMergedRefs(state.startThumb.ref, useFocusWithin<HTMLDivElement>());
  state.endThumb.ref = useMergedRefs(state.endThumb.ref, useFocusWithin<HTMLDivElement>());

  useRangeSliderState_unstable(state, props);

  return state;
};
