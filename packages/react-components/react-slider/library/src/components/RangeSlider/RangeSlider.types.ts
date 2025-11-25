import * as React from 'react';
import type { ComponentProps, ComponentState, Slot } from '@fluentui/react-utilities';

export type RangeSliderValue = {
  /**
   * Lower value for the range.
   */
  start: number;

  /**
   * Upper value for the range.
   */
  end: number;
};

export type RangeSliderOnChangeData = {
  value: RangeSliderValue;
};

export type RangeSliderSlots = {
  /**
   * The root of the RangeSlider.
   * The root slot receives the `className` and `style` specified directly on the `<RangeSlider>`.
   */
  root: NonNullable<Slot<'div'>>;

  /**
   * The RangeSlider's base. It is used to display the currently selected range.
   */
  rail: NonNullable<Slot<'div'>>;

  /**
   * The lower draggable thumb used to select the minimum value of the range.
   * This is the element containing `role = 'slider'`.
   */
  startThumb: NonNullable<Slot<'div'>>;

  /**
   * The upper draggable thumb used to select the maximum value of the range.
   * This is the element containing `role = 'slider'`.
   */
  endThumb: NonNullable<Slot<'div'>>;

  /**
   * Hidden range input that mirrors the lower value for form submissions.
   */
  startInput: NonNullable<Slot<'input'>> & {
    orient?: 'horizontal' | 'vertical';
  };

  /**
   * Hidden range input used for pointer/touch interactions and to mirror the upper value.
   */
  endInput: NonNullable<Slot<'input'>> & {
    orient?: 'horizontal' | 'vertical';
  };
};

export type RangeSliderProps = Omit<
  ComponentProps<Partial<RangeSliderSlots>, 'endInput'>,
  'defaultValue' | 'onChange' | 'size' | 'value'
> & {
  /**
   * The starting value for an uncontrolled RangeSlider.
   */
  defaultValue?: RangeSliderValue;

  /**
   * Whether the RangeSlider is disabled.
   */
  disabled?: boolean;

  /**
   * Maximum slider value.
   * @default 100
   */
  max?: number;

  /**
   * Minimum slider value.
   * @default 0
   */
  min?: number;

  /**
   * Size of the slider.
   * @default 'medium'
   */
  size?: 'small' | 'medium';

  /**
   * Step amount the slider will change by when moved.
   * @default 1
   */
  step?: number;

  /**
   * Controlled value for the RangeSlider.
   */
  value?: RangeSliderValue;

  /**
   * Render the RangeSlider vertically with the smallest value at the bottom.
   */
  vertical?: boolean;

  /**
   * Fires when the slider values change.
   */
  onChange?: (ev: React.ChangeEvent<HTMLInputElement>, data: RangeSliderOnChangeData) => void;
};

export type RangeSliderState = ComponentState<RangeSliderSlots> &
  Pick<RangeSliderProps, 'disabled' | 'size' | 'vertical'> & {
    value: RangeSliderValue;
  };
