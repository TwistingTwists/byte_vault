
// import ReactPlayer from 'react-player'
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

// Define types for our data
interface SimulationDataPoint {
  time: number;
  threads: number;
  memory: number;
  cpu: number;
  throughput: number;
  queue: number;
}

interface MetricDefinition {
  name: keyof SimulationDataPoint;
  color: string;
  label: string;
}

export const ThreadResourceVisualization: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  
  useEffect(() => {
    if (!svgRef.current) return;
    
    // Clear previous visualization if any
    d3.select(svgRef.current).selectAll("*").remove();
    
    // SVG dimensions
    const width = 700;
    const height = 400;
    const margin = { top: 40, right: 30, bottom: 50, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create SVG element
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");
    
    // Create group element for the visualization
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Add title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text("Thread-Per-Connection Resource Consumption");
    
    // Define data for simulation
    const simulationData: SimulationDataPoint[] = [
      { time: 0, threads: 5, memory: 10, cpu: 5, throughput: 0, queue: 0 },
      { time: 1, threads: 15, memory: 15, cpu: 15, throughput: 10, queue: 0 },
      { time: 2, threads: 50, memory: 25, cpu: 25, throughput: 25, queue: 5 },
      { time: 3, threads: 100, memory: 40, cpu: 40, throughput: 40, queue: 10 },
      { time: 4, threads: 250, memory: 60, cpu: 60, throughput: 50, queue: 30 },
      { time: 5, threads: 500, memory: 80, cpu: 80, throughput: 45, queue: 100 },
      { time: 6, threads: 1000, memory: 95, cpu: 95, throughput: 30, queue: 500 }
    ];
    
    // Set up scales
    const xScale = d3.scaleLinear()
      .domain([0, simulationData.length - 1])
      .range([0, innerWidth]);
    
    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([innerHeight, 0]);
    
    // Create axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(simulationData.length)
      .tickFormat((d) => {
        const value = d as number;
        if (value === 0) return "Start";
        if (value === 1) return "Low Load";
        if (value === simulationData.length - 1) return "High Load";
        return "";
      });
    
    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => `${d}%`);
    
    // Add x axis
    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll("text")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .attr("y", 10);
    
    // Add y axis
    g.append("g")
      .attr("class", "y-axis")
      .call(yAxis);
    
    // Add y-axis label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -40)
      .attr("x", -innerHeight / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .text("Resource Utilization (%)");
    
    // Line generators
    const createLine = (metric: keyof SimulationDataPoint) => {
      return d3.line<SimulationDataPoint>()
        .x(d => xScale(d.time))
        .y(d => yScale(d[metric]))
        .curve(d3.curveMonotoneX);
    };
    
    // Add lines
    const metrics: MetricDefinition[] = [
      { name: "threads", color: "#1f77b4", label: "Active Threads (%)" },
      { name: "memory", color: "#ff7f0e", label: "Memory Usage (%)" },
      { name: "cpu", color: "#2ca02c", label: "CPU Usage (%)" },
      { name: "throughput", color: "#d62728", label: "Throughput (%)" },
      { name: "queue", color: "#9467bd", label: "Request Queue (%)" }
    ];
    
    metrics.forEach(metric => {
      g.append("path")
        .datum(simulationData)
        .attr("fill", "none")
        .attr("stroke", metric.color)
        .attr("stroke-width", 3)
        .attr("d", createLine(metric.name));
      
      // Add dots for each data point
      g.selectAll(`.dot-${metric.name}`)
        .data(simulationData)
        .enter()
        .append("circle")
        .attr("class", `dot-${metric.name}`)
        .attr("cx", d => xScale(d.time))
        .attr("cy", d => yScale(d[metric.name]))
        .attr("r", 4)
        .attr("fill", metric.color);
    });
    
    // Add legend
    const legend = svg.append("g")
      .attr("transform", `translate(${width - margin.right - 150}, ${margin.top})`);
    
    metrics.forEach((metric, i) => {
      const legendRow = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`);
      
      legendRow.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", metric.color);
      
      legendRow.append("text")
        .attr("x", 15)
        .attr("y", 10)
        .attr("text-anchor", "start")
        .text(metric.label);
    });
    
    // Add annotation for the context switching effect
    const annotation = g.append("g")
      .attr("transform", `translate(${xScale(5)}, ${yScale(85)})`);
    
    annotation.append("rect")
      .attr("x", -100)
      .attr("y", -45)
      .attr("width", 200)
      .attr("height", 40)
      .attr("fill", "white")
      .attr("stroke", "#333")
      .attr("stroke-width", 1)
      .attr("rx", 5)
      .attr("opacity", 0.8);
    
    annotation.append("text")
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .text("Context switching overhead");
    
    annotation.append("text")
      .attr("text-anchor", "middle")
      .attr("y", 15)
      .attr("font-size", "11px")
      .text("reduces throughput");
    
    annotation.append("line")
      .attr("x1", 0)
      .attr("y1", -5)
      .attr("x2", 0)
      .attr("y2", 40)
      .attr("stroke", "#333")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3");
    
  }, []);
  
  return (
    <div className="visualization-container" style={{ backgroundColor: "#f8f9fa", padding: "10px", borderRadius: "5px", marginBottom: "20px" }}>
      <svg ref={svgRef}></svg>
      <div style={{ textAlign: "center", fontSize: "13px", marginTop: "5px" }}>
        <strong>Figure 1:</strong> As connection count increases, resources are consumed by thread overhead, 
        while throughput plateaus and then declines due to context switching costs.
      </div>
    </div>
  );
};
