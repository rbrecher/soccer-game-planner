import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldView, shortName } from './FieldView';
import { FIELD_POSITIONS } from '../../constants/game';
import type { Player, PositionName, SlotAssignment } from '../../types';

/** Build a positions record with all slots empty and unlocked. */
function emptyPositions(): Record<PositionName, SlotAssignment> {
  return Object.fromEntries(
    [...FIELD_POSITIONS, 'GK'].map((pos) => [pos, { playerId: null, locked: false }]),
  ) as Record<PositionName, SlotAssignment>;
}

describe('shortName', () => {
  it('abbreviates last name to initial for two-part names', () => {
    expect(shortName('John Doe')).toBe('John D.');
  });

  it('returns the full name unchanged for single-word names', () => {
    expect(shortName('Pele')).toBe('Pele');
  });

  it('uses the last word initial for names with more than two parts', () => {
    expect(shortName('Mary Jane Watson')).toBe('Mary W.');
  });

  it('trims leading and trailing whitespace', () => {
    expect(shortName('  Alice  Smith  ')).toBe('Alice S.');
  });
});

describe('FieldView', () => {
  const players: Player[] = [
    { id: 'p1', name: 'John Doe', goalieWilling: false, seasonGKQuarters: 0 },
    { id: 'p2', name: 'Jane Smith', goalieWilling: false, seasonGKQuarters: 0 },
  ];

  it('renders a button for each of the 6 field positions', () => {
    const positions = emptyPositions();
    render(<FieldView positions={positions} players={[]} onSlotClick={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(FIELD_POSITIONS.length);
  });

  it('shows the player shortName inside the token when a player is assigned', () => {
    const positions = emptyPositions();
    positions['Striker'] = { playerId: 'p1', locked: false };
    render(<FieldView positions={positions} players={players} onSlotClick={vi.fn()} />);

    expect(screen.getByText('John D.')).toBeInTheDocument();
  });

  it('shows a lock indicator when the slot is locked', () => {
    const positions = emptyPositions();
    positions['Striker'] = { playerId: 'p1', locked: true };
    render(<FieldView positions={positions} players={players} onSlotClick={vi.fn()} />);

    expect(screen.getByText('🔒')).toBeInTheDocument();
  });

  it('calls onSlotClick with the correct position when a token is clicked', async () => {
    const user = userEvent.setup();
    const onSlotClick = vi.fn();
    const positions = emptyPositions();
    render(<FieldView positions={positions} players={[]} onSlotClick={onSlotClick} />);

    // Click the Striker button (aria-label includes "Striker")
    const strikerButton = screen.getByRole('button', { name: /Striker/i });
    await user.click(strikerButton);

    expect(onSlotClick).toHaveBeenCalledWith('Striker');
  });
});
