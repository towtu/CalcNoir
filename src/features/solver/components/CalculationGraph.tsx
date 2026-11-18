import React, { useId, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import type {
  Calculation,
  CalculationStep,
  CurvePoint,
  Point,
} from '../../../core/numerics/types';
import { tabular, typeScale, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui';
import { formatNumber } from '../../../shared/ui/format';

// Scaling by the largest magnitude also handles domains whose subtraction overflows.
function fraction(value: number, minimum: number, maximum: number): number {
  const scale = Math.max(Math.abs(minimum), Math.abs(maximum), 1);
  const span = maximum / scale - minimum / scale;
  return span === 0 ? 0.5 : (value / scale - minimum / scale) / span;
}
function segments(
  samples: CurvePoint[],
  project: (point: Point) => Point,
): string {
  let connected = false;
  return samples
    .map(sample => {
      if (
        sample.y === null ||
        !Number.isFinite(sample.y) ||
        !Number.isFinite(sample.x)
      ) {
        connected = false;
        return '';
      }
      const point = project({ x: sample.x, y: sample.y });
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
        connected = false;
        return '';
      }
      const command = `${connected ? 'L' : 'M'}${point.x.toFixed(
        2,
      )},${point.y.toFixed(2)}`;
      connected = true;
      return command;
    })
    .join(' ');
}

export function CalculationGraph({
  calculation,
  step,
  interactive = false,
}: {
  calculation: Calculation;
  step?: CalculationStep;
  interactive?: boolean;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(300);
  const [view, setView] = useState({ start: 0, end: 1, zoom: 1 });
  const [inspected, setInspected] = useState<CurvePoint | null>(null);
  const clipId = `plot-${useId().replace(/:/g, '')}`;
  const height = 248;
  const left = 48;
  const top = 16;
  const plotWidth = Math.max(120, width - left - 14);
  const plotHeight = height - top - 34;
  const [sampleMin, sampleMax] = calculation.xDomain;
  // Convex interpolation keeps wide finite domains safe from subtraction overflow.
  const at = (position: number) =>
    sampleMin * (1 - position) + sampleMax * position;
  const xmin = at(view.start);
  const xmax = at(view.end);
  const visibleSamples = useMemo(
    () =>
      calculation.curve.filter(
        sample =>
          Number.isFinite(sample.x) && sample.x >= xmin && sample.x <= xmax,
      ),
    [calculation.curve, xmin, xmax],
  );
  const points =
    calculation.problem.kind === 'interpolation'
      ? calculation.problem.points
      : [];
  const target =
    calculation.problem.kind === 'interpolation' && calculation.value !== null
      ? { x: calculation.problem.targetX, y: calculation.value }
      : null;
  const yValues = [
    0,
    target?.y ?? null,
    ...calculation.curve.map(point => point.y),
    ...points.map(point => point.y),
    ...(step?.helper.map(point => point.y) ?? []),
    ...(step?.contribution?.map(point => point.y) ?? []),
    step?.marker?.y ?? null,
  ];
  if (calculation.plotKind === 'mapping') {
    yValues.push(xmin, xmax);
  }
  const finiteY = yValues.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );
  let ymin = Math.min(...finiteY);
  let ymax = Math.max(...finiteY);
  if (ymin === ymax) {
    ymin -= Math.max(1, Math.abs(ymin) * 0.1);
    ymax += Math.max(1, Math.abs(ymax) * 0.1);
  }
  const padding = (ymax - ymin) * 0.08;
  if (Number.isFinite(ymin - padding) && Number.isFinite(ymax + padding)) {
    ymin -= padding;
    ymax += padding;
  }
  const x = (value: number) => left + fraction(value, xmin, xmax) * plotWidth;
  const y = (value: number) =>
    top + (1 - fraction(value, ymin, ymax)) * plotHeight;
  const project = (point: Point) => ({ x: x(point.x), y: y(point.y) });
  const kindLabel =
    calculation.plotKind === 'mapping'
      ? 'g(x)'
      : calculation.plotKind === 'polynomial'
      ? 'P(x)'
      : 'f(x)';
  const diagonalStart = Math.max(xmin, ymin);
  const diagonalEnd = Math.min(xmax, ymax);
  const inspectionLabel =
    calculation.curve.length === 0
      ? 'No stored curve samples for this calculation.'
      : inspected
      ? inspected.y === null || !Number.isFinite(inspected.y)
        ? `No finite sampled value at x = ${formatNumber(inspected.x)}`
        : `Sampled point: x = ${formatNumber(
            inspected.x,
          )}, ${kindLabel} = ${formatNumber(inspected.y)}`
      : 'Touch or drag the graph to inspect a sampled point.';
  const inspect = (event: GestureResponderEvent) => {
    const position = Math.max(
      0,
      Math.min(1, (event.nativeEvent.locationX - left) / plotWidth),
    );
    if (!Number.isFinite(position) || visibleSamples.length === 0) {
      return;
    }
    // Choose an existing sample, including gaps; never evaluate an expression here.
    const nearest = visibleSamples.reduce((best, sample) =>
      Math.abs(fraction(sample.x, xmin, xmax) - position) <
      Math.abs(fraction(best.x, xmin, xmax) - position)
        ? sample
        : best,
    );
    setInspected(nearest);
  };
  const zoom = (factor: number) => {
    const nextZoom = Math.max(1, Math.min(8, view.zoom * factor));
    const span = 1 / nextZoom;
    const center = inspected
      ? fraction(inspected.x, sampleMin, sampleMax)
      : (view.start + view.end) / 2;
    const start = Math.max(0, Math.min(1 - span, center - span / 2));
    if (at(start) < at(start + span)) {
      setView({ start, end: start + span, zoom: nextZoom });
    }
  };
  const inspectedPoint =
    inspected && inspected.y !== null && Number.isFinite(inspected.y)
      ? { x: inspected.x, y: inspected.y }
      : null;
  return (
    <View
      style={styles.container}
      onLayout={event =>
        setWidth(Math.max(200, event.nativeEvent.layout.width))
      }
    >
      <View
        testID="sampled-graph"
        accessible
        accessibilityRole={interactive ? 'adjustable' : 'image'}
        accessibilityHint={
          interactive
            ? 'Touch or drag to inspect. Swipe up or down to move between stored samples.'
            : undefined
        }
        accessibilityActions={
          interactive
            ? [
                { name: 'increment', label: 'Next sampled point' },
                { name: 'decrement', label: 'Previous sampled point' },
              ]
            : undefined
        }
        onAccessibilityAction={
          interactive
            ? event => {
                if (visibleSamples.length === 0) {
                  return;
                }
                const current = inspected
                  ? visibleSamples.indexOf(inspected)
                  : -1;
                const next =
                  event.nativeEvent.actionName === 'increment'
                    ? Math.min(visibleSamples.length - 1, current + 1)
                    : current < 0
                    ? visibleSamples.length - 1
                    : Math.max(0, current - 1);
                setInspected(visibleSamples[next]);
              }
            : undefined
        }
        onStartShouldSetResponder={() => interactive}
        onMoveShouldSetResponder={() => interactive}
        onResponderTerminationRequest={() => true}
        onResponderGrant={interactive ? inspect : undefined}
        onResponderMove={interactive ? inspect : undefined}
        accessibilityLabel={`Sampled graph of ${kindLabel}, x from ${formatNumber(
          xmin,
        )} to ${formatNumber(xmax)}.${
          step
            ? ` Selected step ${step.index}. ${step.explanation}`
            : ' No recorded step selected.'
        }${interactive ? ` ${inspectionLabel}` : ''}`}
      >
        <Svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          accessible={false}
        >
          <Defs>
            <ClipPath id={clipId}>
              <Rect x={left} y={top} width={plotWidth} height={plotHeight} />
            </ClipPath>
          </Defs>
          <Rect
            x={left}
            y={top}
            width={plotWidth}
            height={plotHeight}
            fill={colors.surfaceAlt}
            rx={4}
          />
          {[0, 0.25, 0.5, 0.75, 1].map(tick => (
            <G key={tick}>
              <Line
                x1={left + tick * plotWidth}
                x2={left + tick * plotWidth}
                y1={top}
                y2={top + plotHeight}
                stroke={colors.border}
                strokeWidth={1}
              />
              <Line
                x1={left}
                x2={left + plotWidth}
                y1={top + tick * plotHeight}
                y2={top + tick * plotHeight}
                stroke={colors.border}
                strokeWidth={1}
              />
            </G>
          ))}
          <G clipPath={`url(#${clipId})`}>
            {step?.interval ? (
              <Rect
                x={Math.min(x(step.interval[0]), x(step.interval[1]))}
                y={top}
                width={Math.abs(x(step.interval[1]) - x(step.interval[0]))}
                height={plotHeight}
                fill={colors.secondary}
                opacity={0.12}
              />
            ) : null}
            {xmin <= 0 && xmax >= 0 ? (
              <Line
                x1={x(0)}
                x2={x(0)}
                y1={top}
                y2={top + plotHeight}
                stroke={colors.muted}
                strokeWidth={1}
              />
            ) : null}
            {ymin <= 0 && ymax >= 0 ? (
              <Line
                x1={left}
                x2={left + plotWidth}
                y1={y(0)}
                y2={y(0)}
                stroke={colors.muted}
                strokeWidth={1}
              />
            ) : null}
            {calculation.plotKind === 'mapping' &&
            diagonalStart <= diagonalEnd ? (
              <Line
                x1={x(diagonalStart)}
                y1={y(diagonalStart)}
                x2={x(diagonalEnd)}
                y2={y(diagonalEnd)}
                stroke={colors.muted}
                strokeDasharray="5 5"
                strokeWidth={1.5}
              />
            ) : null}
            <Path
              d={segments(calculation.curve, project)}
              stroke={colors.accent}
              strokeWidth={2.5}
              fill="none"
            />
            {step?.contribution ? (
              <Path
                d={segments(step.contribution, project)}
                stroke={colors.secondary}
                strokeWidth={2}
                strokeDasharray="5 3"
                fill="none"
              />
            ) : null}
            {step && step.helper.length > 1 ? (
              <Path
                d={segments(step.helper, project)}
                stroke={colors.secondary}
                strokeWidth={2}
                strokeDasharray="7 4"
                fill="none"
              />
            ) : null}
            {points.map((point, index) => (
              <Circle
                key={index}
                cx={x(point.x)}
                cy={y(point.y)}
                r={3.5}
                fill={colors.surface}
                stroke={colors.accent}
                strokeWidth={1.5}
              />
            ))}
            {target ? (
              <Circle
                cx={x(target.x)}
                cy={y(target.y)}
                r={5}
                fill={colors.surface}
                stroke={colors.text}
                strokeWidth={2}
              />
            ) : null}
            {step?.marker ? (
              <Circle
                cx={x(step.marker.x)}
                cy={y(step.marker.y)}
                r={5}
                fill={colors.secondary}
                stroke={colors.surface}
                strokeWidth={2}
              />
            ) : null}
            {interactive && inspectedPoint ? (
              <G>
                <Line
                  x1={x(inspectedPoint.x)}
                  x2={x(inspectedPoint.x)}
                  y1={top}
                  y2={top + plotHeight}
                  stroke={colors.text}
                  strokeWidth={1}
                  strokeDasharray="2 4"
                />
                <Line
                  x1={left}
                  x2={left + plotWidth}
                  y1={y(inspectedPoint.y)}
                  y2={y(inspectedPoint.y)}
                  stroke={colors.text}
                  strokeWidth={1}
                  strokeDasharray="2 4"
                />
                <Circle
                  testID="inspected-sample"
                  cx={x(inspectedPoint.x)}
                  cy={y(inspectedPoint.y)}
                  r={4}
                  fill={colors.surface}
                  stroke={colors.text}
                  strokeWidth={2}
                />
              </G>
            ) : null}
          </G>
          <SvgText
            x={left - 6}
            y={top + 5}
            textAnchor="end"
            fontSize={12}
            fill={colors.muted}
          >
            {formatNumber(ymax, 2)}
          </SvgText>
          <SvgText
            x={left - 6}
            y={top + plotHeight}
            textAnchor="end"
            fontSize={12}
            fill={colors.muted}
          >
            {formatNumber(ymin, 2)}
          </SvgText>
          <SvgText x={left} y={height - 12} fontSize={12} fill={colors.muted}>
            {formatNumber(xmin, 3)}
          </SvgText>
          <SvgText
            x={left + plotWidth}
            y={height - 12}
            textAnchor="end"
            fontSize={12}
            fill={colors.muted}
          >
            {formatNumber(xmax, 3)}
          </SvgText>
          <SvgText
            x={left + plotWidth / 2}
            y={height - 12}
            textAnchor="middle"
            fontSize={12}
            fill={colors.muted}
          >
            x
          </SvgText>
        </Svg>
      </View>
      <View style={styles.legend}>
        <Text style={[styles.legendText, { color: colors.accent }]}>
          ━━ {kindLabel}
        </Text>
        {step?.interval || step?.helper.length || step?.contribution ? (
          <Text style={[styles.legendText, { color: colors.secondary }]}>
            ┄┄ Selected step · filled marker
          </Text>
        ) : null}
        {calculation.plotKind === 'mapping' ? (
          <Text style={[styles.legendText, { color: colors.muted }]}>
            ┄┄ y = x
          </Text>
        ) : null}
      </View>
      {interactive ? (
        <>
          <Text style={[styles.readout, { color: colors.text }]}>
            {inspectionLabel}
          </Text>
          <View style={styles.controls}>
            <Button
              label="Zoom in"
              tone="secondary"
              onPress={() => zoom(2)}
              disabled={view.zoom >= 8 || visibleSamples.length === 0}
            />
            <Button
              label="Zoom out"
              tone="secondary"
              onPress={() => zoom(0.5)}
              disabled={view.zoom <= 1}
            />
            <Button
              label="Reset view"
              tone="quiet"
              onPress={() => {
                setView({ start: 0, end: 1, zoom: 1 });
                setInspected(null);
              }}
            />
          </View>
          <Text style={[styles.note, { color: colors.muted }]}>
            {view.zoom}× horizontal zoom · stored samples only
          </Text>
        </>
      ) : null}
      <Text style={[styles.note, { color: colors.muted }]}>
        Stored sampled values; gaps stay open. Zoom does not add precision.
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { gap: 10 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  readout: { ...typeScale.numericSmall, ...tabular },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendText: typeScale.caption,
  note: typeScale.caption,
});
