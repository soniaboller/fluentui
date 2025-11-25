'use client';

import * as React from 'react';
import { clamp, useControllableState, useEventCallback } from '@fluentui/react-utilities';
import { useFluent_unstable as useFluent } from '@fluentui/react-shared-contexts';
import { rangeSliderCSSVars } from './useRangeSliderStyles.styles';
import type { RangeSliderProps, RangeSliderState, RangeSliderValue } from './RangeSlider.types';

const {
  rangeSliderDirectionVar,
  rangeSliderLowerProgressVar,
  rangeSliderUpperProgressVar,
  rangeSliderStepsPercentVar,
} = rangeSliderCSSVars;

const getPercent = (value: number, min: number, max: number) => (max === min ? 0 : ((value - min) / (max - min)) * 100);

const toTuple = (value?: RangeSliderValue): [number, number] | undefined =>
  value ? [value.start, value.end] : undefined;

const toValueObject = (values: [number, number]): RangeSliderValue => ({ start: values[0], end: values[1] });

const createSyntheticChangeEvent = (value: number): React.ChangeEvent<HTMLInputElement> =>
  ({
    target: { value: value.toString() },
    currentTarget: { value: value.toString() },
  } as React.ChangeEvent<HTMLInputElement>);

export const useRangeSliderState_unstable = (state: RangeSliderState, props: RangeSliderProps): RangeSliderState => {
  'use no memo';

  const { min = 0, max = 100, step } = props;
  const { dir } = useFluent();
  const [currentValues, setCurrentValues] = useControllableState<[number, number]>({
    state: toTuple(props.value),
    defaultState: toTuple(props.defaultValue),
    initialState: [min, Math.min(min + 10, max)] as [number, number],
  });

  const normalizedValues = currentValues ?? ([min, Math.min(min + 10, max)] as [number, number]);
  const clampedLower = clamp(Math.min(normalizedValues[0], normalizedValues[1]), min, max);
  const clampedUpper = clamp(Math.max(normalizedValues[0], normalizedValues[1]), min, max);
  const lowerValue = clampedLower;
  const upperValue = Math.max(clampedUpper, lowerValue);

  state.value = toValueObject([lowerValue, upperValue]);

  const lowerPercent = getPercent(lowerValue, min, max);
  const upperPercent = getPercent(upperValue, min, max);

  const activeDragThumb = React.useRef<'start' | 'end' | null>(null);
  const interactiveThumbRef = React.useRef<'start' | 'end'>('end');

  const updateValues = useEventCallback((newValues: [number, number], ev?: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentValues(newValues);
    props.onChange?.(ev ?? createSyntheticChangeEvent(newValues[1]), { value: toValueObject(newValues) });
  });

  const stepValue = step !== undefined && step > 0 ? step : 1;

  const onStartThumbKeyDown = useEventCallback((ev: React.KeyboardEvent) => {
    if (props.disabled) {
      return;
    }

    let newValue = lowerValue;
    switch (ev.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        ev.preventDefault();
        newValue = Math.max(lowerValue - stepValue, min);
        updateValues([newValue, upperValue]);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        ev.preventDefault();
        newValue = Math.min(lowerValue + stepValue, upperValue);
        updateValues([newValue, upperValue]);
        break;
      case 'Home':
        ev.preventDefault();
        updateValues([min, upperValue]);
        break;
      case 'End':
        ev.preventDefault();
        updateValues([upperValue, upperValue]);
        break;
      case 'PageDown':
        ev.preventDefault();
        newValue = Math.max(lowerValue - stepValue * 10, min);
        updateValues([newValue, upperValue]);
        break;
      case 'PageUp':
        ev.preventDefault();
        newValue = Math.min(lowerValue + stepValue * 10, upperValue);
        updateValues([newValue, upperValue]);
        break;
    }
  });

  const onEndThumbKeyDown = useEventCallback((ev: React.KeyboardEvent) => {
    if (props.disabled) {
      return;
    }

    let newValue = upperValue;
    switch (ev.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        ev.preventDefault();
        newValue = Math.max(upperValue - stepValue, lowerValue);
        updateValues([lowerValue, newValue]);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        ev.preventDefault();
        newValue = Math.min(upperValue + stepValue, max);
        updateValues([lowerValue, newValue]);
        break;
      case 'Home':
        ev.preventDefault();
        updateValues([lowerValue, lowerValue]);
        break;
      case 'End':
        ev.preventDefault();
        updateValues([lowerValue, max]);
        break;
      case 'PageDown':
        ev.preventDefault();
        newValue = Math.max(upperValue - stepValue * 10, lowerValue);
        updateValues([lowerValue, newValue]);
        break;
      case 'PageUp':
        ev.preventDefault();
        newValue = Math.min(upperValue + stepValue * 10, max);
        updateValues([lowerValue, newValue]);
        break;
    }
  });

  const determineClosestThumbFromPointer = React.useCallback(
    (ev: { currentTarget: Element; clientX: number; clientY: number }) => {
      const rect = ev.currentTarget.getBoundingClientRect();
      const length = state.vertical ? rect.height : rect.width;
      if (!length) {
        return 'end' as const;
      }

      const ratio = state.vertical ? (rect.bottom - ev.clientY) / rect.height : (ev.clientX - rect.left) / rect.width;
      const pointerValue = clamp(min + ratio * (max - min), min, max);

      const distanceToStart = Math.abs(pointerValue - lowerValue);
      const distanceToEnd = Math.abs(pointerValue - upperValue);
      return distanceToStart <= distanceToEnd ? 'start' : 'end';
    },
    [state.vertical, min, max, lowerValue, upperValue],
  );

  const setThumbFromPointerEvent = useEventCallback(
    (ev: React.MouseEvent<HTMLInputElement> | React.PointerEvent<HTMLInputElement>) => {
      if (props.disabled) {
        return;
      }

      if (ev.type === 'mousedown' && typeof window !== 'undefined' && window.PointerEvent) {
        return;
      }

      const closerThumb = determineClosestThumbFromPointer(ev);
      activeDragThumb.current = closerThumb;
      interactiveThumbRef.current = closerThumb;
      ev.currentTarget.value = String(closerThumb === 'start' ? lowerValue : upperValue);
    },
  );

  const updateValuesFromInput = useEventCallback((rawValue: number, ev?: React.ChangeEvent<HTMLInputElement>) => {
    if (props.disabled) {
      return;
    }

    if (activeDragThumb.current === null) {
      const distanceToStart = Math.abs(rawValue - lowerValue);
      const distanceToEnd = Math.abs(rawValue - upperValue);
      const closerThumb = distanceToStart <= distanceToEnd ? 'start' : 'end';
      activeDragThumb.current = closerThumb;
      interactiveThumbRef.current = closerThumb;
    }

    let newValues: [number, number];
    if (activeDragThumb.current === 'start') {
      newValues = [clamp(rawValue, min, upperValue), upperValue];
    } else {
      newValues = [lowerValue, clamp(rawValue, lowerValue, max)];
    }

    updateValues(newValues, ev);
  });

  const clearActiveDragThumb = useEventCallback(() => {
    if (props.disabled) {
      return;
    }
    activeDragThumb.current = null;
  });

  const onRangeInputChange: React.ChangeEventHandler<HTMLInputElement> = useEventCallback(ev => {
    updateValuesFromInput(Number(ev.currentTarget.value), ev);
  });

  const onRangeInputInput: React.FormEventHandler<HTMLInputElement> = useEventCallback(ev => {
    updateValuesFromInput(Number(ev.currentTarget.value));
  });

  const stepPercent = step !== undefined && step > 0 && max !== min ? `${(step * 100) / (max - min)}%` : undefined;
  const rootVariables = {
    [rangeSliderDirectionVar]: state.vertical ? '0deg' : dir === 'ltr' ? '90deg' : '270deg',
    [rangeSliderLowerProgressVar]: `${lowerPercent}%`,
    [rangeSliderUpperProgressVar]: `${upperPercent}%`,
    ...(stepPercent && { [rangeSliderStepsPercentVar]: stepPercent }),
  };

  state.root.style = {
    ...rootVariables,
    ...state.root.style,
  };

  state.startInput.value = String(lowerValue);
  state.startInput.min = min;
  state.startInput.max = upperValue;
  state.startInput.step = step;
  state.startInput.disabled = props.disabled;
  state.startInput['aria-hidden'] = true;
  state.startInput.tabIndex = -1;

  const interactiveThumb = activeDragThumb.current ?? interactiveThumbRef.current ?? 'end';
  state.endInput.value = String(interactiveThumb === 'start' ? lowerValue : upperValue);
  state.endInput.min = min;
  state.endInput.max = max;
  state.endInput.step = step;
  state.endInput.disabled = props.disabled;
  state.endInput['aria-hidden'] = true;
  state.endInput.tabIndex = -1;
  state.endInput.onChange = onRangeInputChange;
  state.endInput.onInput = onRangeInputInput;
  state.endInput.onPointerDown = setThumbFromPointerEvent;
  state.endInput.onPointerUp = clearActiveDragThumb;
  state.endInput.onPointerCancel = clearActiveDragThumb;
  state.endInput.onMouseDown = setThumbFromPointerEvent;
  state.endInput.onMouseUp = clearActiveDragThumb;
  state.endInput.onMouseLeave = clearActiveDragThumb;
  state.endInput.onPointerLeave = clearActiveDragThumb;

  const labelledBy = props['aria-labelledby'];
  if (labelledBy) {
    if (!state.startThumb['aria-labelledby']) {
      state.startThumb['aria-labelledby'] = labelledBy;
    }
    if (!state.endThumb['aria-labelledby']) {
      state.endThumb['aria-labelledby'] = labelledBy;
    }
  }

  state.startThumb.tabIndex = props.disabled ? -1 : 0;
  state.startThumb.role = 'slider';
  state.startThumb['aria-valuemin'] = min;
  state.startThumb['aria-valuemax'] = upperValue;
  state.startThumb['aria-valuenow'] = lowerValue;
  state.startThumb['aria-valuetext'] = `${lowerValue}`;
  state.startThumb['aria-disabled'] = props.disabled || undefined;
  state.startThumb.onKeyDown = onStartThumbKeyDown;
  state.startThumb.onFocus = useEventCallback(() => {
    interactiveThumbRef.current = 'start';
  });

  state.endThumb.tabIndex = props.disabled ? -1 : 0;
  state.endThumb.role = 'slider';
  state.endThumb['aria-valuemin'] = lowerValue;
  state.endThumb['aria-valuemax'] = max;
  state.endThumb['aria-valuenow'] = upperValue;
  state.endThumb['aria-valuetext'] = `${upperValue}`;
  state.endThumb['aria-disabled'] = props.disabled || undefined;
  state.endThumb.onKeyDown = onEndThumbKeyDown;
  state.endThumb.onFocus = useEventCallback(() => {
    interactiveThumbRef.current = 'end';
  });

  return state;
};
