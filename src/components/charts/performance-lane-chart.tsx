"use client";

import type { EChartsOption } from "echarts";
import { useMemo } from "react";

import { useECharts } from "@/components/charts/use-echarts";
import { chartPalette, withChartTheme } from "@/lib/chart-theme";

export function PerformanceLaneChart({
  lanes,
}: {
  lanes: Array<{ title: string; score: number }>;
}) {
  const option = useMemo<EChartsOption>(
    () =>
      withChartTheme({
        grid: { left: 120, right: 24, top: 16, bottom: 24 },
        tooltip: { trigger: "axis" },
        xAxis: {
          type: "value",
          splitLine: { lineStyle: { color: "#1e293b" } },
        },
        yAxis: {
          type: "category",
          data: lanes.map((lane) => lane.title).reverse(),
          axisLine: { show: false },
          axisTick: { show: false },
        },
        series: [
          {
            type: "bar",
            data: lanes
              .map((lane, index) => ({
                value: lane.score,
                itemStyle: {
                  color: chartPalette[index % chartPalette.length],
                  borderRadius: [0, 8, 8, 0],
                },
              }))
              .reverse(),
            barWidth: 14,
          },
        ],
      }),
    [lanes],
  );

  const ref = useECharts(option, [lanes]);

  return (
    <div
      ref={ref}
      className="h-[220px] w-full"
      role="img"
      aria-label="性能排查 lane 优先级"
    />
  );
}
