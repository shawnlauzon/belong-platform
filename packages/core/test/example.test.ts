import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

describe('Example Test', () => {
  it('renders without crashing', () => {
    render(React.createElement('div', null, 'Test'));
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
