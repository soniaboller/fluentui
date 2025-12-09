import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { isConformant } from '../../testing/isConformant';
import { RangeSlider } from './RangeSlider';

describe('RangeSlider', () => {
  isConformant({
    Component: RangeSlider,
    displayName: 'RangeSlider',
    primarySlot: 'endInput',
  });

  it('renders the expected DOM structure', () => {
    const { container } = render(<RangeSlider defaultValue={{ start: 10, end: 30 }} />);

    expect(container.querySelectorAll('input')).toHaveLength(2);
    expect(container.querySelector('.fui-RangeSlider__startThumb')).toBeTruthy();
    expect(container.querySelector('.fui-RangeSlider__endThumb')).toBeTruthy();
    expect(container.querySelector('.fui-RangeSlider__rail')).toBeTruthy();
  });

  it('sets aria metadata on inputs', () => {
    render(<RangeSlider defaultValue={{ start: 5, end: 15 }} min={0} max={20} />);

    const sliders = screen.getAllByRole('slider');
    expect(sliders).toHaveLength(2);
    expect(sliders[0].getAttribute('aria-valuenow')).toBe('5');
    expect(sliders[1].getAttribute('aria-valuenow')).toBe('15');
  });
});
