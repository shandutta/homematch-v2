/**
 * Shared display-name derivation. Used by both the Clerk webhook
 * (initial profile insert) and the JIT bootstrap path so the fallback
 * chain stays consistent.
 *
 * Chain (caller composes first/last/username explicitly; this helper
 * is the email-local-part terminal fallback):
 *
 *   firstName + lastName  ->  firstName  ->  lastName  ->  username
 *   ->  email local-part  ->  null
 *
 * Email-local-part exists so dropping Clerk's Username field
 * (USERNAME-DROP from the prod audit) doesn't leave new users with
 * a null display_name, which previously caused the avatar to fall
 * back to "?" or an email-prefix initial (Section 6 of the audit).
 *
 * The transformation is intentionally conservative: titlecase a
 * single-word local-part, split common separators (./_/+/-) into
 * space-joined words, but make zero attempt to demangle obvious
 * machine-generated aliases. If the result looks unusable, the
 * caller is free to ignore it (returns null for empty input).
 */

const SEPARATORS = /[._+-]+/

function titlecase(word: string): string {
  if (word.length === 0) return word
  return word[0]!.toUpperCase() + word.slice(1).toLowerCase()
}

export function deriveDisplayNameFromEmail(
  email: string | null | undefined
): string | null {
  if (!email) return null
  const local = email.split('@')[0]
  if (!local) return null
  const trimmed = local.trim()
  if (!trimmed) return null

  // Drop the +suffix tag if present (e.g., "alex+test" -> "alex").
  const withoutTag = trimmed.split('+')[0] ?? trimmed
  if (!withoutTag) return null

  const parts = withoutTag
    .split(SEPARATORS)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  if (parts.length === 0) return null
  return parts.map(titlecase).join(' ')
}
