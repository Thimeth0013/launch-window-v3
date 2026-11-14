// Landing classification shared by the launch story (wording, recovery
// diagram) and the trajectory model (where a returning stage comes down).

/* eslint-disable @typescript-eslint/no-explicit-any */

export type RecoveryKind = 'catch' | 'rtls' | 'asds' | 'ocean' | 'parachute' | 'vertical' | 'expended' | 'other';

/**
 * LL2 has no "catch" landing type — a tower catch arrives as RTLS to a launch
 * mount (Starship's "Orbital Launch Mount B"). Read the location and the
 * landing description so it's described as what it is.
 */
export function classifyLanding(landing: any): RecoveryKind {
  if (!landing?.attempt) return 'expended';
  const abbrev = (landing.type?.abbrev ?? '').toUpperCase();
  const name = (landing.type?.name ?? '').toLowerCase();
  const text = `${landing.description ?? ''} ${landing.landing_location?.name ?? ''}`.toLowerCase();
  if (abbrev === 'EXP' || name.includes('expend')) return 'expended';
  if (/\bcatch|chopstick|launch mount|\btower\b/.test(text)) return 'catch';
  if (abbrev === 'RTLS') return 'rtls';
  if (abbrev === 'ASDS') return 'asds';
  if (abbrev === 'OCEAN' || /ocean|splash/.test(name)) return 'ocean';
  if (abbrev === 'PCL' || name.includes('parachute')) return 'parachute';
  if (abbrev === 'VL' || name.includes('vertical')) return 'vertical';
  return 'other';
}

/** A recorded failure whose description says the stage ended up in the sea. */
export function splashedDownInstead(landing: any): boolean {
  return landing?.success === false && /splash|ocean|gulf|\bsea\b/i.test(landing.description ?? '');
}
