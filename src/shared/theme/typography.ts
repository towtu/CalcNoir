import { Platform } from 'react-native';
import type { TextStyle } from 'react-native';

/**
 * Numelix type system — three families, three jobs.
 *
 * **Poppins** is the brand voice. Its SemiBold weight is *reserved for the
 * logotype* and is used nowhere else in the product, which is what keeps the
 * wordmark the single heaviest thing on any screen. Everything else Poppins
 * touches — screen titles, the navigation header — is Medium, so a title can
 * sit directly under the wordmark without competing with it.
 *
 * **Inter** is the interface voice: sections, buttons, body copy, labels,
 * hints. It holds up at small sizes and never tries to be expressive.
 *
 * **STIX Two Text** is the mathematics voice: formulas and expressions you
 * read rather than type. It is a Times-compatible serif drawn for scientific
 * publishing, so a formula looks like the textbook rather than like source
 * code. Computer Modern itself is not distributable from a web font service;
 * STIX is the closest obtainable face with the same textbook register.
 *
 * **JetBrains Mono** is the data voice: the answer figure, numbers, step
 * values, table cells. Every digit is the same width, so columns align and a
 * value does not reflow as it converges — the thing a numerical methods app
 * asks of type more than anything else.
 *
 * Font family naming differs by platform. Android and iOS resolve a bundled
 * face by its PostScript/file name, so weights are separate families there.
 * The browser preview loads the families from Google Fonts and picks the
 * weight numerically.
 */
type Family = 'poppins' | 'inter' | 'mono' | 'math';
type Weight = 'regular' | 'medium' | 'semibold' | 'bold';

const nativeFamily: Record<Family, Record<Weight, string>> = {
  poppins: {
    regular: 'Poppins-Regular',
    medium: 'Poppins-Medium',
    semibold: 'Poppins-SemiBold',
    bold: 'Poppins-Bold',
  },
  inter: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semibold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },
  mono: {
    regular: 'JetBrainsMono-Regular',
    medium: 'JetBrainsMono-Medium',
    semibold: 'JetBrainsMono-SemiBold',
    bold: 'JetBrainsMono-Bold',
  },
  math: {
    regular: 'STIXTwoText-Regular',
    medium: 'STIXTwoText-Medium',
    semibold: 'STIXTwoText-SemiBold',
    bold: 'STIXTwoText-Bold',
  },
};

const cssWeight: Record<Weight, TextStyle['fontWeight']> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

const cssFamily: Record<Family, string> = {
  poppins: 'Poppins',
  inter: 'Inter',
  mono: 'JetBrains Mono',
  math: 'STIX Two Text',
};

export function brandFace(family: Family, weight: Weight): TextStyle {
  return Platform.select<TextStyle>({
    web: { fontFamily: cssFamily[family], fontWeight: cssWeight[weight] },
    default: { fontFamily: nativeFamily[family][weight] },
  }) as TextStyle;
}

/**
 * Reserved for the logotype. `Wordmark.tsx` draws the brand mark as outlines
 * rather than live text, so a missing font can never alter the logo — this
 * token exists to state the reservation and to set the wordmark if it is ever
 * switched to live text. **Do not use it for anything else.**
 *
 * Bold, not SemiBold: the wordmark has to be the heaviest thing on screen for
 * the reservation to buy anything. Everything else Poppins touches is Medium.
 */
export const logotype: TextStyle = {
  ...brandFace('poppins', 'bold'),
  letterSpacing: -0.4,
};

/**
 * The ramp: 34/40, 26/32, 24/32, 18/24, 16/24, 14/20, 12/18.
 * Nothing outside this scale should appear in a StyleSheet.
 */
export const typeScale = {
  /** The answer. One per screen, and it is always a number. */
  display: { ...brandFace('mono', 'bold'), fontSize: 34, lineHeight: 40 },
  /**
   * The home headline. Still Medium — the logotype keeps the heavy weights, so
   * the hero earns its prominence from size and the gradient on "Solve."
   * rather than from stealing the wordmark's weight.
   */
  hero: { ...brandFace('poppins', 'medium'), fontSize: 34, lineHeight: 41 },
  /** Screen titles — the hero line. Medium, never SemiBold. */
  title: { ...brandFace('poppins', 'medium'), fontSize: 26, lineHeight: 32 },
  /** Secondary figures: comparison values, step numbers. */
  value: { ...brandFace('mono', 'semibold'), fontSize: 24, lineHeight: 32 },
  /** Section headers and card titles. */
  section: { ...brandFace('inter', 'semibold'), fontSize: 18, lineHeight: 24 },
  /** Buttons, row titles and other interactive text. */
  action: { ...brandFace('inter', 'semibold'), fontSize: 16, lineHeight: 24 },
  /** Default reading size. */
  body: { ...brandFace('inter', 'regular'), fontSize: 16, lineHeight: 24 },
  /**
   * A formula presented for reading. Italic is the recognisable textbook
   * convention for symbols; there is no LaTeX parser here, so digits take it
   * too — acceptable because these formulas are nearly all symbolic.
   */
  mathDisplay: {
    ...brandFace('math', 'medium'),
    fontStyle: 'italic' as const,
    fontSize: 20,
    lineHeight: 30,
  },
  /** The same voice inline, inside a sentence or a table row. */
  math: {
    ...brandFace('math', 'regular'),
    fontStyle: 'italic' as const,
    fontSize: 17,
    lineHeight: 26,
  },
  /** Numbers and anything still being typed. */
  numeric: { ...brandFace('mono', 'medium'), fontSize: 16, lineHeight: 24 },
  /** Field labels and table headers. */
  label: { ...brandFace('inter', 'medium'), fontSize: 14, lineHeight: 20 },
  /** Compact values: graph readouts, step cells. */
  numericSmall: { ...brandFace('mono', 'regular'), fontSize: 14, lineHeight: 20 },
  /** Supporting text; never smaller than this. */
  caption: { ...brandFace('inter', 'regular'), fontSize: 12, lineHeight: 18 },
} satisfies Record<string, TextStyle>;

/**
 * Kept alongside the mono styles as a fallback guarantee: if a JetBrains Mono
 * face fails to load, the substituted face still lines its digits up.
 */
export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

/** The 4 / 8 / 12 / 16 / 24 / 32 scale from DESIGN.md. Content edges use 20. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  edge: 20,
} as const;

/**
 * 12 dp corners everywhere that is not a pill: fields, buttons, cards and
 * icon tiles all share one radius so nothing reads tighter than its neighbour.
 */
export const radius = { control: 12, card: 12, pill: 999 } as const;
export const minTouch = 48;

/**
 * Tab bar labels. The one place 12 px needs medium weight to stay legible
 * against the filled violet bar.
 */
export const tabLabel: TextStyle = {
  ...brandFace('inter', 'medium'),
  fontSize: 12,
  lineHeight: 16,
};

/**
 * Native stack header titles. The native header applies only family, size and
 * weight — no lineHeight, no fontVariant — so this token is narrowed to match
 * what react-native-screens will actually honour.
 */
const headerFace = brandFace('poppins', 'medium');

export const headerTitle: Pick<
  TextStyle,
  'fontFamily' | 'fontSize' | 'fontWeight'
> = {
  fontFamily: headerFace.fontFamily,
  fontWeight: headerFace.fontWeight,
  fontSize: 18,
};
