import { useProfile } from '@/contexts/ProfileContext';
import { useAuth } from '@/hooks/useAuth';

/**
 * The persona/operator split.
 *
 * Before the merge these were the same thing: whoever you picked on the
 * profile screen *was* your identity, and the database recorded only that.
 * Nobody could tell which student had booked a given hour, which made the
 * time ledger useless as evidence of anyone's conduct — awkward for a course
 * that spends Week 8 arguing the ledger is exactly that.
 *
 * Now there are two:
 *
 *   FEE EARNER (persona)  — ks.profiles. The fictional lawyer whose name and
 *                           rate appear on the task or time entry. Chosen by
 *                           the student, stable across the class.
 *   OPERATOR (real user)  — auth.users. The student actually clicking. Written
 *                           to `performed_by` on every mutable row.
 *
 * Use `stamp()` to add the operator to any insert payload. Database triggers
 * also default `performed_by` to auth.uid(), so this is belt and braces — but
 * being explicit keeps the intent legible at the call site.
 */
export function useActingAs() {
  const { selectedProfile } = useProfile();
  const { user, isAdmin } = useAuth();

  return {
    /** The persona the work is booked to (may be null before selection). */
    feeEarner: selectedProfile,
    /** The real student performing the action. */
    operator: user,
    isAdmin,
    /** True once both halves are known and writes are safe to attempt. */
    ready: Boolean(selectedProfile && user),
    /** Add the operator stamp to an insert/update payload. */
    stamp<T extends Record<string, unknown>>(payload: T): T & { performed_by: string | null } {
      return { ...payload, performed_by: user?.id ?? null };
    },
  };
}
