import type { EChartsOption } from "echarts";

export const chartPalette = [
  "#22d3ee",
  "#34d399",
  "#a78bfa",
  "#fbbf24",
  "#fb7185",
  "#60a5fa",
];

export const chartBaseTextStyle = {
  color: "#94a3b8",
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
};

export function withChartTheme(option: EChartsOption): EChartsOption {
  return {
    backgroundColor: "transparent",
    textStyle: chartBaseTextStyle,
    ...option,
  };
}
