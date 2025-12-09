'use client';

import * as React from 'react';
import {
  clamp,
  mergeCallbacks,
  useControllableState,
  useEventCallback,
  useMergedRefs,
} from '@fluentui/react-utilities';
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
  const stepValue = step !== undefined && step > 0 ? step : 1;
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
  const pointerIdRef = React.useRef<number | null>(null);
  const interactiveThumbRef = React.useRef<'start' | 'end'>('end');

  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const railRef = React.useRef<HTMLDivElement | null>(null);
  const startInputRef = React.useRef<HTMLInputElement | null>(null);
  const endInputRef = React.useRef<HTMLInputElement | null>(null);
  const startThumbRef = React.useRef<HTMLDivElement | null>(null);
  const endThumbRef = React.useRef<HTMLDivElement | null>(null);

  state.root.ref = useMergedRefs(state.root.ref, rootRef);
  state.rail.ref = useMergedRefs(state.rail.ref, railRef);
  state.startInput.ref = useMergedRefs(state.startInput.ref, startInputRef);
  state.endInput.ref = useMergedRefs(state.endInput.ref, endInputRef);
  state.startThumb.ref = useMergedRefs(state.startThumb.ref, startThumbRef);
  state.endThumb.ref = useMergedRefs(state.endThumb.ref, endThumbRef);

  const updateValues = useEventCallback((newValues: [number, number], ev?: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentValues(newValues);
    props.onChange?.(ev ?? createSyntheticChangeEvent(newValues[1]), { value: toValueObject(newValues) });
  });

  const getRailRect = React.useCallback(
    () => railRef.current?.getBoundingClientRect() ?? rootRef.current?.getBoundingClientRect() ?? null,
    [],
  );

  const getPointerValue = React.useCallback(
    (clientX: number, clientY: number) => {
      const rect = getRailRect();
      if (!rect) {
        return null;
      }

      if (state.vertical) {
        if (!rect.height) {
          return null;
        }
        const offset = rect.bottom - clientY;
        const ratio = clamp(offset / rect.height, 0, 1);
        return min + ratio * (max - min);
      }

      if (!rect.width) {
        return null;
      }

      let ratio = (clientX - rect.left) / rect.width;
      if (dir === 'rtl') {
        ratio = 1 - ratio;
      }

      ratio = clamp(ratio, 0, 1);
      return min + ratio * (max - min);
    },
    [dir, getRailRect, max, min, state.vertical],
  );

  const determineClosestThumb = React.useCallback(
    (value: number) => {
      const distanceToStart = Math.abs(value - lowerValue);
      const distanceToEnd = Math.abs(value - upperValue);
      return distanceToStart <= distanceToEnd ? 'start' : 'end';
    },
    [lowerValue, upperValue],
  );

  const focusThumbInput = React.useCallback((thumb: 'start' | 'end') => {
    const input = thumb === 'start' ? startInputRef.current : endInputRef.current;
    input?.focus();
  }, []);

  const clampToStep = React.useCallback(
    (value: number) => {
      if (!stepValue) {
        return clamp(value, min, max);
      }
      const steps = Math.round((value - min) / stepValue);
      const snapped = min + steps * stepValue;
      return clamp(snapped, min, max);
    },
    [max, min, stepValue],
  );

  const updateThumbFromPointerValue = useEventCallback((value: number, thumb?: 'start' | 'end') => {
    if (props.disabled) {
      return;
    }

    const targetThumb = thumb ?? activeDragThumb.current ?? determineClosestThumb(value);
    const snappedValue = clampToStep(value);

    if (targetThumb === 'start') {
      const newStart = Math.min(snappedValue, upperValue);
      updateValues([newStart, upperValue], createSyntheticChangeEvent(newStart));
      return;
    }

    const newEnd = Math.max(snappedValue, lowerValue);
    updateValues([lowerValue, newEnd], createSyntheticChangeEvent(newEnd));
  });

  const getThumbFromTarget = React.useCallback((target: EventTarget | null): 'start' | 'end' | null => {
    if (!(target instanceof Node)) {
      return null;
    }
    if (startThumbRef.current?.contains(target)) {
      return 'start';
    }
    if (endThumbRef.current?.contains(target)) {
      return 'end';
    }
    return null;
  }, []);

  const handlePointerDown = useEventCallback((ev: React.PointerEvent<HTMLDivElement>) => {
    if (props.disabled) {
      return;
    }

    const pointerValue = getPointerValue(ev.clientX, ev.clientY);
    if (pointerValue === null) {
      return;
    }

    const targetThumb = getThumbFromTarget(ev.target) ?? determineClosestThumb(pointerValue);
    activeDragThumb.current = targetThumb;
    interactiveThumbRef.current = targetThumb;
    pointerIdRef.current = ev.pointerId;
    focusThumbInput(targetThumb);
    ev.preventDefault();
    ev.currentTarget.setPointerCapture(ev.pointerId);
    updateThumbFromPointerValue(pointerValue, targetThumb);
  });

  const handlePointerMove = useEventCallback((ev: React.PointerEvent<HTMLDivElement>) => {
    if (props.disabled || pointerIdRef.current !== ev.pointerId || activeDragThumb.current === null) {
      return;
    }

    const pointerValue = getPointerValue(ev.clientX, ev.clientY);
    if (pointerValue === null) {
      return;
    }

    ev.preventDefault();
    updateThumbFromPointerValue(pointerValue, activeDragThumb.current);
  });

  const releasePointer = React.useCallback((target: EventTarget & Element, pointerId: number) => {
    if (target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId);
    }
    pointerIdRef.current = null;
    activeDragThumb.current = null;
  }, []);

  const handlePointerEnd = useEventCallback((ev: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== ev.pointerId) {
      return;
    }
    releasePointer(ev.currentTarget, ev.pointerId);
  });

  const handlePointerCancel = useEventCallback((ev: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== ev.pointerId) {
      return;
    }
    releasePointer(ev.currentTarget, ev.pointerId);
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
  state.startInput.onChange = mergeCallbacks(
    state.startInput.onChange,
    useEventCallback(ev => {
      if (props.disabled) {
        return;
      }
      const rawValue = Number(ev.currentTarget.value);
      const newStart = Math.min(clampToStep(rawValue), upperValue);
      updateValues([newStart, upperValue], ev);
    }),
  );

  state.startInput.onFocus = mergeCallbacks(
    state.startInput.onFocus,
    useEventCallback(() => {
      interactiveThumbRef.current = 'start';
    }),
  );

  state.endInput.value = String(upperValue);
  state.endInput.min = lowerValue;
  state.endInput.max = max;
  state.endInput.step = step;
  state.endInput.disabled = props.disabled;
  state.endInput.onChange = mergeCallbacks(
    state.endInput.onChange,
    useEventCallback(ev => {
      if (props.disabled) {
        return;
      }
      const rawValue = Number(ev.currentTarget.value);
      const newEnd = Math.max(clampToStep(rawValue), lowerValue);
      updateValues([lowerValue, newEnd], ev);
    }),
  );

  state.endInput.onFocus = mergeCallbacks(
    state.endInput.onFocus,
    useEventCallback(() => {
      interactiveThumbRef.current = 'end';
    }),
  );

  state.root.onPointerDown = mergeCallbacks(state.root.onPointerDown, handlePointerDown);
  state.root.onPointerMove = mergeCallbacks(state.root.onPointerMove, handlePointerMove);
  state.root.onPointerUp = mergeCallbacks(state.root.onPointerUp, handlePointerEnd);
  state.root.onPointerCancel = mergeCallbacks(state.root.onPointerCancel, handlePointerCancel);

  const labelledBy = props['aria-labelledby'];
  if (labelledBy) {
    if (!state.startInput['aria-labelledby']) {
      state.startInput['aria-labelledby'] = labelledBy;
    }
    if (!state.endInput['aria-labelledby']) {
      state.endInput['aria-labelledby'] = labelledBy;
    }
  }

  state.startThumb.tabIndex = undefined;
  state.startThumb.role = 'presentation';
  // state.startThumb['aria-hidden'] = true;
  state.endThumb.tabIndex = undefined;
  state.endThumb.role = 'presentation';
  // state.endThumb['aria-hidden'] = true;

  return state;
};
