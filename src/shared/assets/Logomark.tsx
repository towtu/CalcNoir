import React, { useId } from 'react';
import Svg, {
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

/**
 * The Numelix logomark: two hooks crossed by a gradient swoosh.
 *
 * Ported from the brand SVG to react-native-svg so it stays sharp at every
 * density and needs no raster export. The source gradients used
 * `gradientTransform="translate(...) scale(.998 -.998)"`; those are baked into
 * the coordinates below so the transform does not have to be re-applied here.
 *
 * The gradient is the brand's own and does not change between light and dark.
 */
const RATIO = 149.15 / 180.27;

const VIOLET_TO_BLUE = [
  { offset: '0', color: '#57129E' },
  { offset: '0.08', color: '#661DB5' },
  { offset: '0.19', color: '#7C2BD5' },
  { offset: '0.3', color: '#8B36EC' },
  { offset: '0.4', color: '#943CFA' },
  { offset: '0.49', color: '#983FFF' },
  { offset: '0.56', color: '#9346FE' },
  { offset: '0.66', color: '#865AFE' },
  { offset: '0.79', color: '#717CFD' },
  { offset: '0.93', color: '#55AAFC' },
  { offset: '1', color: '#45C4FC' },
];

const SWOOSH_SWEEP = [
  { offset: '0', color: '#983FFF' },
  { offset: '0.11', color: '#716CFF' },
  { offset: '0.23', color: '#4E95FF' },
  { offset: '0.34', color: '#35B3FF' },
  { offset: '0.43', color: '#25C5FF' },
  { offset: '0.5', color: '#20CCFF' },
  { offset: '0.57', color: '#25C5FF' },
  { offset: '0.66', color: '#36B2FF' },
  { offset: '0.77', color: '#5092FF' },
  { offset: '0.9', color: '#7567FF' },
  { offset: '1', color: '#983FFF' },
];

const LEFT_HOOK =
  'M0,31.32v70.1C0,123.8,12.02,134.24,30.05,134.24c16.52,0,31.55-13.42,42.06-26.85-12.02,10.44-24.04,17.9-34.55,16.41-8.26-2.24-9.01-19.39-8.26-35.8l.76-32.68C20.39,47.36,10.36,39.29,0,31.32Z';
const RIGHT_HOOK =
  'M180.27,117.83V47.73c0-22.37-12.02-32.81-30.05-32.81-16.52,0-31.55,13.42-42.06,26.85,12.02-10.44,24.04-17.9,34.55-16.41,8.26,2.24,9.01,19.39,8.26,35.8l-.75,32.68c9.67,7.96,19.69,16.03,30.05,24Z';
const SWOOSH =
  'M22.53,0c27.04,0,84.13,61.15,157.74,117.83v5.97c0,10.44-6.01,25.36-22.53,25.36C130.7,149.15,73.61,88,0,31.32v-5.97C0,14.92,6.01,0,22.53,0Z';
const SHADE_LEFT =
  'M22.53,2.98c27.04,0,84.13,61.15,157.74,117.83v5.97c0,10.44-6.01,25.36-22.53,25.36C130.7,152.14,73.61,90.98,0,34.31v-5.97C0,17.9,6.01,2.98,22.53,2.98Z';
const SHADE_RIGHT =
  'M22.53,-2.98c27.04,0,84.13,61.15,157.74,117.83v5.97c0,10.44-6.01,25.36-22.53,25.36C130.7,146.17,73.61,85.02,0,28.34v-5.97C0,11.93,6.01,-2.98,22.53,-2.98Z';

export function Logomark({ size = 40 }: { size?: number }) {
  /**
   * SVG ids are document-global, so two Logomarks on screen at once — the
   * header and the hero, or two screens mid-transition — would both resolve
   * `url(#...)` to whichever defs mounted first. That clipped the mark down to
   * a bare diagonal. One unique prefix per instance keeps them separate.
   */
  const uid = useId().replace(/:/g, '');
  return (
    <Svg
      width={size}
      height={size * RATIO}
      viewBox="0 0 180.27 149.15"
      accessible={false}
    >
      <Defs>
        <LinearGradient
          id={`numelixLeft${uid}`}
          x1="39.72"
          y1="59.49"
          x2="11.11"
          y2="136.84"
          gradientUnits="userSpaceOnUse"
        >
          {VIOLET_TO_BLUE.map(stop => (
            <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
          ))}
        </LinearGradient>
        <LinearGradient
          id={`numelixRight${uid}`}
          x1="139.77"
          y1="93.55"
          x2="168.19"
          y2="6.06"
          gradientUnits="userSpaceOnUse"
        >
          {VIOLET_TO_BLUE.map(stop => (
            <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
          ))}
        </LinearGradient>
        <LinearGradient
          id={`numelixSwoosh${uid}`}
          x1="16.43"
          y1="15.21"
          x2="164.87"
          y2="134.87"
          gradientUnits="userSpaceOnUse"
        >
          {SWOOSH_SWEEP.map(stop => (
            <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
          ))}
        </LinearGradient>
        <LinearGradient
          id={`numelixSheen${uid}`}
          x1="107.83"
          y1="51"
          x2="72.19"
          y2="98.55"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.3" />
          <Stop offset="0.38" stopColor="#FFFFFF" stopOpacity="0.1" />
          <Stop offset="0.39" stopColor="#FFFFFF" stopOpacity="0" />
          <Stop offset="1" stopColor="#14105A" stopOpacity="0.14" />
        </LinearGradient>
        <ClipPath id={`numelixClipLeft${uid}`}>
          <Path d={LEFT_HOOK} />
        </ClipPath>
        <ClipPath id={`numelixClipRight${uid}`}>
          <Path d={RIGHT_HOOK} />
        </ClipPath>
      </Defs>

      <Path d={LEFT_HOOK} fill={`url(#numelixLeft${uid})`} />
      <Path d={RIGHT_HOOK} fill={`url(#numelixRight${uid})`} />

      {/* Depth where the swoosh passes behind each hook. */}
      <G clipPath={`url(#numelixClipLeft${uid})`} opacity={0.55}>
        <Path d={SHADE_LEFT} fill="#57129E" />
      </G>
      <G clipPath={`url(#numelixClipRight${uid})`} opacity={0.55}>
        <Path d={SHADE_RIGHT} fill="#57129E" />
      </G>

      <Path d={SWOOSH} fill={`url(#numelixSwoosh${uid})`} />
      <Path d={SWOOSH} fill={`url(#numelixSheen${uid})`} />
      <Path d={SWOOSH} fill={`url(#numelixSheen${uid})`} />
    </Svg>
  );
}
