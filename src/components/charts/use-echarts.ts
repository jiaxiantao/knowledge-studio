"use client";

import type { ECharts, EChartsOption } from "echarts";
import { useEffect, useRef } from "react";

export function useECharts(option: EChartsOption, deps: unknown[] = []) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    let disposed = false;

    async function mount() {
      const echarts = await import("echarts");
      if (disposed || !containerRef.current) {
        return;
      }

      if (!chartRef.current) {
        chartRef.current = echarts.init(containerRef.current, undefined, {
          renderer: "canvas",
        });
      }

      chartRef.current.setOption(option, { notMerge: true });
      chartRef.current.resize();
    }

    void mount();

    const observer = new ResizeObserver(() => {
      chartRef.current?.resize();
    });
    observer.observe(element);

    return () => {
      disposed = true;
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- option serialized via deps
  }, deps);

  useEffect(() => {
    return () => {
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  return containerRef;
}
