import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GoalieRow } from './GoalieRow';
import type { Player } from '../../types';

const players: Player[] = [
  { id: 'p1', name: 'Alice Keeper', goalieWilling: true, seasonGKQuarters: 1 },
  { id: 'p2', name: 'Bob Field', goalieWilling: false, seasonGKQuarters: 0 },
];

describe('GoalieRow', () => {
  it('renders the assigned goalkeeper name', () => {
    render(
      <GoalieRow
        quarter="Q1"
        gkPlayerId="p1"
        gkLocked={false}
        availablePlayers={players}
        allPlayers={players}
        onOverride={vi.fn()}
        onUnlockGK={vi.fn()}
      />,
    );

    expect(screen.getByText('Alice Keeper')).toBeInTheDocument();
  });

  it('renders "—" when no goalkeeper is assigned', () => {
    render(
      <GoalieRow
        quarter="Q1"
        gkPlayerId={null}
        gkLocked={false}
        availablePlayers={players}
        allPlayers={players}
        onOverride={vi.fn()}
        onUnlockGK={vi.fn()}
      />,
    );

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows "Clear override" button when GK is locked', () => {
    render(
      <GoalieRow
        quarter="Q1"
        gkPlayerId="p1"
        gkLocked={true}
        availablePlayers={players}
        allPlayers={players}
        onOverride={vi.fn()}
        onUnlockGK={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Clear override/i })).toBeInTheDocument();
  });

  it('hides "Clear override" button when GK is not locked', () => {
    render(
      <GoalieRow
        quarter="Q1"
        gkPlayerId="p1"
        gkLocked={false}
        availablePlayers={players}
        allPlayers={players}
        onOverride={vi.fn()}
        onUnlockGK={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /Clear override/i })).not.toBeInTheDocument();
  });

  it('calls onUnlockGK with the correct quarter when "Clear override" is clicked', async () => {
    const user = userEvent.setup();
    const onUnlockGK = vi.fn();

    render(
      <GoalieRow
        quarter="Q2"
        gkPlayerId="p1"
        gkLocked={true}
        availablePlayers={players}
        allPlayers={players}
        onOverride={vi.fn()}
        onUnlockGK={onUnlockGK}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Clear override/i }));
    expect(onUnlockGK).toHaveBeenCalledWith('Q2');
  });
});
