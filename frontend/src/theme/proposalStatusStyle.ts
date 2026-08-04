import { Feather } from '@expo/vector-icons';
import { ProposalStatus } from '../api/proposals';
import { AccentSwatch, Colors } from './palettes';

// Single source of truth for proposal-status color + icon + label, reused by
// StatusBadge, the ProposalStatus progress steps, the proposal history
// timeline, and the supervisor review queue card tint — previously each of
// those defined its own ad hoc color mapping for the same 6 statuses, so the
// same status could render in different colors depending which screen you
// were on (e.g. "submitted" was blue on one screen, violet on another).
export interface ProposalStatusStyle extends AccentSwatch {
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
}

export function proposalStatusStyle(colors: Colors, status: ProposalStatus): ProposalStatusStyle {
  const neutral: AccentSwatch = { accent: colors.textMuted, tint: colors.surfaceSunken, fg: colors.textMuted };
  const danger: AccentSwatch = { accent: colors.danger, tint: colors.dangerTint, fg: colors.danger };

  switch (status) {
    case 'draft':
      return { ...neutral, label: 'Draft', icon: 'edit-2' };
    case 'submitted':
      return { ...colors.accents.violet, label: 'Submitted', icon: 'send' };
    case 'under_review':
      return { ...colors.accents.amber, label: 'Under review', icon: 'eye' };
    case 'approved':
      return { ...colors.accents.green, label: 'Approved', icon: 'check-circle' };
    case 'rejected':
      return { ...danger, label: 'Rejected', icon: 'x-circle' };
    case 'changes_requested':
      return { ...colors.accents.amber, label: 'Changes requested', icon: 'edit-3' };
    default:
      return { ...neutral, label: status, icon: 'circle' };
  }
}
