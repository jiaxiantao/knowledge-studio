"use client";

import type { EChartsOption } from "echarts";
import { useMemo } from "react";

import { useECharts } from "@/components/charts/use-echarts";
import { withChartTheme } from "@/lib/chart-theme";

export function NotesTimelineChart({
  data,
}: {
  data: Array<{ month: string; count: number }>;
}) {
  const option = useMemo<EChartsOption>(
    () =>
      withChartTheme({
        grid: { left: 40, right: 16, top: 24, bottom: 32 },
        tooltip: { trigger: "axis" },
        xAxis: {
          type: "category",
          boundaryGap: false,
          data: data.map((item) => item.month),
          axisLine: { lineStyle: { color: "#334155" } },
        },
        yAxis: {
          type: "value",
          minInterval: 1,
          splitLine: { lineStyle: { color: "#1e293b" } },
        },
        series: [
          {
            type: "line",
            smooth: true,
            symbol: "circle",
            symbolSize: 8,
            data: data.map((item) => item.count),
            lineStyle: { width: 3, color: "#22d3ee" },
            areaStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: "rgba(34, 211, 238, 0.35)" },
                  { offset: 1, color: "rgba(34, 211, 238, 0.02)" },
                ],
              },
            },
          },
        ],
      }),
    [data],
  );

  const ref = useECharts(option, [data]);

  return (
    <div
      ref={ref}
      className="h-[280px] w-full"
      role="img"
      aria-label="笔记按月更新趋势"
    />
  );
}
