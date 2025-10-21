/**
 * XYMAX Global Namespace
 * Central hub for all shared data, configurations, and functions
 * across discovery, single, and compare modes
 */

const XYMAX = (function() {
    'use strict';
    
    // ============================================================================
    // CONFIGURATION & CONSTANTS
    // ============================================================================
    
    const config = {
        // Available years for temporal analysis
        availableYears: [1996, 2001, 2006, 2011, 2016, 2023],
        
        // Color palette
        colors: {
            // Area colors (for multi-area comparison)
            area1: '#8b5cf6',  // Modern purple - sophisticated and vibrant
            area2: '#06b6d4',  // Cyan blue - clean and contemporary
            
            // Land use category colors (grayscale)
            office: '#9ca3af',   // Medium gray
            housing: '#6b7280',  // Dark gray  
            other: '#4b5563',    // Darker gray
            
            // Age category colors (grayscale)
            age_0_14: '#9ca3af',
            age_15_64: '#6b7280',
            age_65_plus: '#4b5563'
        },
        
        // Data file paths
        dataPaths: {
            tokyoSlimPop: 'data/tokyo_slim_pop.geojson',
            salsa: 'data/salsa.geojson',
            tokyoMesh: 'data/tokyo_mesh.geojson'
        },
        
        // Map layer styling for consistent grid highlighting across all modes
        mapLayers: {
            // Base layer styling (dimming non-selected grids)
            baseFillOpacity: {
                dimmed: 0.5,      // Opacity for non-selected grids
                hidden: 0         // Opacity for selected/hovered grids
            },
            
            // Outline layer styling (subtle grid borders)
            outline: {
                color: '#666666',
                width: 0.5,
                opacity: 0.5
            },
            
            // Selected outline styling (purple borders)
            selectedOutline: {
                color: '#8b5cf6',  // Purple border
                width: 2,
                opacity: 1
            }
        },
        
        // Basemap configurations
        basemaps: {
            satellite: {
                version: 8,
                sources: {
                    'esri-world-imagery': {
                        type: "raster",
                        tiles: [
                            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        ],
                        tileSize: 256,
                        attribution: "Tiles &copy; <a href=\"https://www.esri.com/\">Esri</a> Source: Esri, Earthstar Geographics",
                        maxzoom: 19
                    }
                },
                layers: [
                    {
                        id: "esri-world-imagery-layer",
                        type: "raster",
                        source: "esri-world-imagery"
                    }
                ]
            },
            gsi: {
                version: 8,
                sources: {
                    'gsi-pale': {
                        type: "raster",
                        tiles: [
                            "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png"
                        ],
                        tileSize: 256,
                        attribution: "地理院タイル &copy; <a href=\"https://www.gsi.go.jp/\">国土地理院</a>",
                        maxzoom: 18
                    }
                },
                layers: [
                    {
                        id: "gsi-pale-layer",
                        type: "raster",
                        source: "gsi-pale"
                    }
                ]
            }
        },
        
        // Sankey diagram configuration
        sankeyConfig: {
            defaultWidth: 600,
            defaultHeight: 300,
            margin: { top: 35, right: 30, bottom: 30, left: 80 },
            nodeGap: 2,
            nodeWidthBreakpoints: {
                small: { maxWidth: 400, nodeWidth: 20 },
                medium: { maxWidth: 600, nodeWidth: 30 },
                large: { nodeWidth: 40 }
            },
            compareMode: {
                nodeWidth: 80,
                nodeGap: 5
            }
        }
    };
    
    // ============================================================================
    // SHARED STATE
    // ============================================================================
    
    const state = {
        // Cached data to avoid repeated fetches
        cache: {
            tokyoData: null,
            salsaData: null,
            meshData: null
        }
    };
    
    // ============================================================================
    // DATA LOADING UTILITIES
    // ============================================================================
    
    /**
     * Load and cache GeoJSON data
     */
    async function loadData(dataKey) {
        // Check if already cached
        if (state.cache[dataKey]) {
            return state.cache[dataKey];
        }
        
        const pathMap = {
            tokyoData: config.dataPaths.tokyoSlimPop,
            salsaData: config.dataPaths.salsa,
            meshData: config.dataPaths.tokyoMesh
        };
        
        const path = pathMap[dataKey];
        if (!path) {
            throw new Error(`Unknown data key: ${dataKey}`);
        }
        
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            
            // Cache the data
            state.cache[dataKey] = data;
            return data;
        } catch (error) {
            console.error(`Error loading ${dataKey}:`, error);
            throw error;
        }
    }
    
    // ============================================================================
    // SANKEY DIAGRAM FUNCTIONS
    // ============================================================================
    
    /**
     * Draw temporal sankey diagram (6-year timeline)
     * Used by both discovery/glide mode and single mode
     */
    function drawTemporalSankey(containerId, features, viewMode, availableYears = config.availableYears) {
        console.log('XYMAX.drawTemporalSankey called with', features.length, 'features');
        
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Sankey container not found:', containerId);
            return;
        }
        
        container.innerHTML = '';
        d3.selectAll('.sankey-tooltip').remove();
        
        // Calculate data for all years
        const yearData = availableYears.map(year => {
            let office = 0, housing = 0, other = 0;
            
            features.forEach(feature => {
                const officeKey = `${year}_office_total_use_area`;
                const housingKey = `${year}_housing_total_use_area`;
                const otherKey = `${year}_other_total_use_area`;
                
                const officeValue = Number(feature.properties[officeKey]) || 0;
                const housingValue = Number(feature.properties[housingKey]) || 0;
                const otherValue = Number(feature.properties[otherKey]) || 0;
                
                office += officeValue;
                housing += housingValue;
                other += otherValue;
            });
            
            const total = office + housing + other;
            
            return {
                year,
                office,
                housing,
                other,
                total,
                officePercent: total > 0 ? (office / total) * 100 : 0,
                housingPercent: total > 0 ? (housing / total) * 100 : 0,
                otherPercent: total > 0 ? (other / total) * 100 : 0
            };
        });
        
        // Check if we have any data
        const hasData = yearData.some(d => d.total > 0);
        if (!hasData) {
            container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #ccc; text-align: center;">No land use data available for this area</div>';
            return;
        }
        
        // Setup dimensions
        const containerWidth = container.getBoundingClientRect().width;
        const width = Math.min(containerWidth - 40, config.sankeyConfig.defaultWidth);
        const height = config.sankeyConfig.defaultHeight;
        const margin = config.sankeyConfig.margin;
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        // Create SVG
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .style('display', 'block')
            .style('margin', '0 auto');
        
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        // Colors - grayscale
        const colors = {
            office: config.colors.office,
            housing: config.colors.housing,
            other: config.colors.other
        };
        
        // Category labels for left side
        const categoryLabels = {
            office: 'Office',
            housing: 'Housing',
            other: 'Other'
        };
        
        // Calculate node dimensions - responsive
        let nodeWidth;
        const breakpoints = config.sankeyConfig.nodeWidthBreakpoints;
        if (chartWidth < breakpoints.small.maxWidth) {
            nodeWidth = breakpoints.small.nodeWidth;
        } else if (chartWidth < breakpoints.medium.maxWidth) {
            nodeWidth = breakpoints.medium.nodeWidth;
        } else {
            nodeWidth = breakpoints.large.nodeWidth;
        }
        
        const nodeSpacing = (chartWidth - (availableYears.length * nodeWidth)) / (availableYears.length - 1);
        const nodeGap = config.sankeyConfig.nodeGap;
        
        // Prepare data based on view mode
        let maxValue;
        if (viewMode === 'percent') {
            maxValue = 1; // 100%
        } else {
            maxValue = d3.max(yearData, d => d.total);
        }
        
        // Scale for node heights
        const heightScale = d3.scaleLinear()
            .domain([0, maxValue])
            .range([0, chartHeight * 0.8]);
        
        // Create nodes for each year
        yearData.forEach((data, i) => {
            const x = i * (nodeWidth + nodeSpacing);
            
            // Prepare node data based on view mode
            let nodeData;
            if (viewMode === 'percent') {
                nodeData = [
                    { category: 'office', value: data.officePercent / 100, rawValue: data.office },
                    { category: 'housing', value: data.housingPercent / 100, rawValue: data.housing },
                    { category: 'other', value: data.otherPercent / 100, rawValue: data.other }
                ];
            } else {
                nodeData = [
                    { category: 'office', value: data.office, rawValue: data.office },
                    { category: 'housing', value: data.housing, rawValue: data.housing },
                    { category: 'other', value: data.other, rawValue: data.other }
                ];
            }
            
            // Calculate total height and positions - stack them properly
            const totalHeight = nodeData.reduce((sum, node) => sum + heightScale(node.value), 0) + (nodeData.length - 1) * nodeGap;
            let currentY = (chartHeight - totalHeight) / 2;
            
            // Create nodes for each category
            nodeData.forEach((node) => {
                const nodeHeight = Math.max(2, heightScale(node.value));
                
                // Draw the node rectangle
                const rect = g.append('rect')
                    .attr('x', x)
                    .attr('y', currentY)
                    .attr('width', nodeWidth)
                    .attr('height', nodeHeight)
                    .attr('fill', colors[node.category])
                    .attr('rx', 0);
                
                // Add hover interactions
                rect.style('cursor', 'pointer')
                    .on('mouseover', function(event) {
                        d3.select(this).attr('opacity', 0.8);
                        const displayValue = viewMode === 'percent' ? 
                            `${Math.round(node.value * 100)}%` : 
                            `${Math.round(node.rawValue).toLocaleString()} sq m`;
                        
                        let tooltip = d3.select('.sankey-tooltip');
                        if (tooltip.empty()) {
                            tooltip = d3.select('body').append('div')
                                .attr('class', 'sankey-tooltip')
                                .style('position', 'absolute')
                                .style('background', '#333')
                                .style('color', 'white')
                                .style('padding', '8px 12px')
                                .style('border-radius', '4px')
                                .style('font-size', '12px')
                                .style('pointer-events', 'none')
                                .style('opacity', 0)
                                .style('z-index', 1000);
                        }
                        
                        tooltip.html(`<strong>${node.category.charAt(0).toUpperCase() + node.category.slice(1)} (${data.year})</strong><br/>${displayValue}`)
                            .style('left', (event.pageX + 10) + 'px')
                            .style('top', (event.pageY - 10) + 'px');
                        tooltip.transition().duration(200).style('opacity', 1);
                    })
                    .on('mousemove', function(event) {
                        d3.select('.sankey-tooltip')
                            .style('left', (event.pageX + 10) + 'px')
                            .style('top', (event.pageY - 10) + 'px');
                    })
                    .on('mouseout', function() {
                        d3.select(this).attr('opacity', 1);
                        d3.select('.sankey-tooltip').transition().duration(200).style('opacity', 0);
                    });
                
                // Add value label on node if big enough
                const minHeightForLabel = chartWidth < 400 ? 20 : 15;
                const labelFontSize = chartWidth < 400 ? '8px' : (chartWidth < 600 ? '9px' : '10px');
                
                if (nodeHeight > minHeightForLabel && nodeWidth > 20) {
                    g.append('text')
                        .attr('class', 'sankey-value-text')
                        .attr('x', x + nodeWidth / 2)
                        .attr('y', currentY + nodeHeight / 2)
                        .attr('text-anchor', 'middle')
                        .attr('dominant-baseline', 'middle')
                        .style('font-size', labelFontSize)
                        .style('font-weight', '500')
                        .style('fill', 'white')
                        .text(viewMode === 'percent' ? 
                            `${Math.round(node.value * 100)}%` : 
                            (chartWidth < 400 ? `${Math.round(node.rawValue / 1000)}k` : `${Math.round(node.rawValue).toLocaleString()}`));
                }
                
                // Add category label on the left side of the first column only
                if (i === 0) {
                    g.append('text')
                        .attr('class', 'sankey-category-label')
                        .attr('x', x - 10)
                        .attr('y', currentY + nodeHeight / 2)
                        .attr('text-anchor', 'end')
                        .attr('dominant-baseline', 'middle')
                        .style('font-size', '11px')
                        .style('font-weight', '500')
                        .style('fill', '#fff')
                        .text(categoryLabels[node.category]);
                }
                
                currentY += nodeHeight + nodeGap;
            });
            
            // Add year label below
            const yearFontSize = chartWidth < 400 ? '0.5em' : '0.6em';
            g.append('text')
                .attr('x', x + nodeWidth / 2)
                .attr('y', chartHeight + 25)
                .attr('text-anchor', 'middle')
                .attr('font-size', yearFontSize)
                .attr('font-weight', '600')
                .attr('fill', '#fff')
                .text(data.year);
        });
        
        // Add flowing curves between years
        if (yearData.length > 1) {
            const linkPath = d3.linkHorizontal()
                .x(d => d.x)
                .y(d => d.y);
            
            for (let i = 0; i < yearData.length - 1; i++) {
                const currentData = yearData[i];
                const nextData = yearData[i + 1];
                
                const x1 = i * (nodeWidth + nodeSpacing) + nodeWidth;
                const x2 = (i + 1) * (nodeWidth + nodeSpacing);
                
                // Draw connections for each category
                ['office', 'housing', 'other'].forEach((category, catIndex) => {
                    let currentValue = viewMode === 'percent' ? currentData[category + 'Percent'] / 100 : currentData[category];
                    let nextValue = viewMode === 'percent' ? nextData[category + 'Percent'] / 100 : nextData[category];
                    
                    if (currentValue > 0 && nextValue > 0) {
                        const currentHeight = heightScale(currentValue);
                        const nextHeight = heightScale(nextValue);
                        const minHeight = Math.min(currentHeight, nextHeight);
                        
                        // Calculate positions based on stacking order
                        const currentTotalHeight = (viewMode === 'percent' ? 
                            heightScale(1) : 
                            heightScale(currentData.total)) + (3 - 1) * nodeGap;
                        const nextTotalHeight = (viewMode === 'percent' ? 
                            heightScale(1) : 
                            heightScale(nextData.total)) + (3 - 1) * nodeGap;
                        
                        let currentY = (chartHeight - currentTotalHeight) / 2;
                        let nextY = (chartHeight - nextTotalHeight) / 2;
                        
                        for (let j = 0; j < catIndex; j++) {
                            const catName = ['office', 'housing', 'other'][j];
                            currentY += heightScale(viewMode === 'percent' ? currentData[catName + 'Percent'] / 100 : currentData[catName]) + nodeGap;
                            nextY += heightScale(viewMode === 'percent' ? nextData[catName + 'Percent'] / 100 : nextData[catName]) + nodeGap;
                        }
                        
                        const linkData = {
                            source: { x: x1, y: currentY + currentHeight / 2 },
                            target: { x: x2, y: nextY + nextHeight / 2 }
                        };
                        
                        g.append('path')
                            .attr('d', linkPath(linkData))
                            .attr('stroke', colors[category])
                            .attr('stroke-width', Math.max(1, minHeight * 0.6))
                            .attr('fill', 'none')
                            .attr('opacity', 0.4);
                    }
                });
            }
        }
        
        console.log('Temporal sankey diagram rendered successfully');
    }
    
    /**
     * Draw comparison sankey diagram (2-column side-by-side)
     * Used by compare mode for both land use and age data
     */
    function drawComparisonSankey(containerId, area1Data, area2Data, area1Name, area2Name, viewMode, dataType = 'landuse') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }
        
        container.innerHTML = '';
        d3.selectAll('.sankey-tooltip').remove();
        
        // Configuration based on data type
        const categories = dataType === 'landuse' 
            ? ['office', 'housing', 'other']
            : ['age_0_14', 'age_15_64', 'age_65_plus'];
        
        const categoryLabels = dataType === 'landuse'
            ? ['Office', 'Housing', 'Other']
            : ['0-14', '15-64', '65+'];
        
        const colors = dataType === 'landuse'
            ? {
                office: config.colors.office,
                housing: config.colors.housing,
                other: config.colors.other
            }
            : {
                age_0_14: config.colors.age_0_14,
                age_15_64: config.colors.age_15_64,
                age_65_plus: config.colors.age_65_plus
            };
        
        // Calculate totals for both areas
        const area1Total = area1Data.reduce((sum, val) => sum + val, 0);
        const area2Total = area2Data.reduce((sum, val) => sum + val, 0);
        
        if (area1Total === 0 && area2Total === 0) {
            container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #ccc;">No data available</div>';
            return;
        }
        
        // Setup dimensions
        const containerWidth = container.getBoundingClientRect().width;
        const width = Math.min(containerWidth - 40, config.sankeyConfig.defaultWidth);
        const height = config.sankeyConfig.defaultHeight;
        const margin = config.sankeyConfig.margin;
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        // Create SVG
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .style('display', 'block')
            .style('margin', '0 auto');
        
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        // Calculate column positions and dimensions
        const columnWidth = chartWidth / 2 - 20;
        const nodeWidth = config.sankeyConfig.compareMode.nodeWidth;
        const nodeGap = config.sankeyConfig.compareMode.nodeGap;
        
        const columns = [
            { x: 0, data: area1Data, name: area1Name, total: area1Total, color: config.colors.area1 },
            { x: chartWidth / 2 + 20, data: area2Data, name: area2Name, total: area2Total, color: config.colors.area2 }
        ];
        
        // Determine max value for scaling
        const maxValue = viewMode === 'percent' ? 1 : Math.max(area1Total, area2Total);
        
        const heightScale = d3.scaleLinear()
            .domain([0, maxValue])
            .range([0, chartHeight * 0.8]);
        
        // Draw columns
        columns.forEach(column => {
            const centerX = column.x + columnWidth / 2;
            const nodeX = centerX - nodeWidth / 2;
            
            // Prepare node data
            const nodeData = categories.map((cat, i) => {
                const rawValue = column.data[i];
                const value = viewMode === 'percent' ? (column.total > 0 ? rawValue / column.total : 0) : rawValue;
                return {
                    category: cat,
                    label: categoryLabels[i],
                    value: value,
                    rawValue: rawValue
                };
            });
            
            // Calculate total height of stacked nodes
            const totalHeight = nodeData.reduce((sum, node) => sum + heightScale(node.value), 0) + (nodeData.length - 1) * nodeGap;
            let currentY = (chartHeight - totalHeight) / 2;
            
            // Draw nodes
            nodeData.forEach((node) => {
                const nodeHeight = Math.max(2, heightScale(node.value));
                
                const rect = g.append('rect')
                    .attr('x', nodeX)
                    .attr('y', currentY)
                    .attr('width', nodeWidth)
                    .attr('height', nodeHeight)
                    .attr('fill', colors[node.category])
                    .attr('rx', 0);
                
                // Tooltips
                rect.style('cursor', 'pointer')
                    .on('mouseover', function(event) {
                        d3.select(this).attr('opacity', 0.8);
                        const displayValue = viewMode === 'percent' ? 
                            `${Math.round(node.value * 100)}%` : 
                            `${Math.round(node.rawValue).toLocaleString()}${dataType === 'landuse' ? ' sq m' : ''}`;
                        
                        let tooltip = d3.select('.sankey-tooltip');
                        if (tooltip.empty()) {
                            tooltip = d3.select('body').append('div')
                                .attr('class', 'sankey-tooltip')
                                .style('position', 'absolute')
                                .style('background', '#333')
                                .style('color', 'white')
                                .style('padding', '8px 12px')
                                .style('border-radius', '4px')
                                .style('font-size', '12px')
                                .style('pointer-events', 'none')
                                .style('opacity', 0)
                                .style('z-index', 1000);
                        }
                        
                        tooltip.html(`<strong>${node.label}</strong><br/>${displayValue}`)
                            .style('left', (event.pageX + 10) + 'px')
                            .style('top', (event.pageY - 10) + 'px');
                        tooltip.transition().duration(200).style('opacity', 1);
                    })
                    .on('mousemove', function(event) {
                        d3.select('.sankey-tooltip')
                            .style('left', (event.pageX + 10) + 'px')
                            .style('top', (event.pageY - 10) + 'px');
                    })
                    .on('mouseout', function() {
                        d3.select(this).attr('opacity', 1);
                        d3.select('.sankey-tooltip').transition().duration(200).style('opacity', 0);
                    });
                
                // Category label on the side (external)
                const labelX = nodeX - 10;
                const labelAnchor = 'end';
                
                g.append('text')
                    .attr('x', labelX)
                    .attr('y', currentY + nodeHeight / 2)
                    .attr('text-anchor', labelAnchor)
                    .attr('dominant-baseline', 'middle')
                    .style('font-size', '11px')
                    .style('font-weight', '500')
                    .style('fill', '#fff')
                    .text(node.label);
                
                currentY += nodeHeight + nodeGap;
            });
            
            // Area name label (colored)
            g.append('text')
                .attr('x', centerX)
                .attr('y', chartHeight + 25)
                .attr('text-anchor', 'middle')
                .attr('font-size', '0.9em')
                .attr('font-weight', '700')
                .attr('fill', column.color)
                .text(column.name);
        });
    }
    
    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================
    
    /**
     * Clear tooltip elements
     */
    function clearTooltips() {
        d3.selectAll('.sankey-tooltip').remove();
    }
    
    /**
     * Get responsive node width based on chart width
     */
    function getResponsiveNodeWidth(chartWidth) {
        const breakpoints = config.sankeyConfig.nodeWidthBreakpoints;
        if (chartWidth < breakpoints.small.maxWidth) {
            return breakpoints.small.nodeWidth;
        } else if (chartWidth < breakpoints.medium.maxWidth) {
            return breakpoints.medium.nodeWidth;
        } else {
            return breakpoints.large.nodeWidth;
        }
    }
    
    /**
     * Draw a two-column sankey diagram (e.g., for age breakdown)
     * Used for showing breakdown from a single total to multiple categories
     */
    function drawTwoColumnSankey(container, config) {
        // config should include: leftData, rightData, colors, legendData, leftLabel, rightLabel, showValues, usePercentage
        container.innerHTML = '';
        d3.selectAll('.sankey-tooltip').remove();
        
        // Extract usePercentage flag (default to false)
        const usePercentage = config.usePercentage || false;
        
        const containerWidth = container.getBoundingClientRect().width;
        // Ensure minimum width of 300px to avoid negative values
        const width = Math.max(300, Math.min(containerWidth - 40, 600));
        const height = 300;
        const margin = { top: 35, right: 30, bottom: 30, left: 30 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        // Create SVG
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .style('display', 'block')
            .style('margin', '0 auto');
        
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        // Node dimensions - consistent for both diagrams
        const nodeWidth = chartWidth < 400 ? 30 : 40;
        const nodeGap = 2;
        
        // Left column (single bar)
        const leftX = 50;
        const leftHeight = chartHeight * 0.8;
        const leftY = (chartHeight - leftHeight) / 2;
        
        g.append('rect')
            .attr('x', leftX)
            .attr('y', leftY)
            .attr('width', nodeWidth)
            .attr('height', leftHeight)
            .attr('fill', '#6b7280')
            .attr('rx', 0);
        
        g.append('text')
            .attr('x', leftX + nodeWidth / 2)
            .attr('y', leftY - 10)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('fill', '#fff')
            .text(config.leftLabel);
            
        g.append('text')
            .attr('x', leftX + nodeWidth / 2)
            .attr('y', leftY + leftHeight + 20)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('fill', '#ccc')
            .text(config.leftData.total.toLocaleString());
        
        // Right column (multiple bars)
        const rightX = chartWidth - nodeWidth - 50;
        
        // Calculate heights proportional to values
        const heightScale = d3.scaleLinear()
            .domain([0, config.leftData.total])
            .range([0, leftHeight]);
        
        let currentY = leftY;
        
        config.rightData.forEach((data) => {
            const nodeHeight = Math.max(2, heightScale(data.value));
            
            // Draw node
            g.append('rect')
                .attr('x', rightX)
                .attr('y', currentY)
                .attr('width', nodeWidth)
                .attr('height', nodeHeight)
                .attr('fill', config.colors[data.category])
                .attr('rx', 0);
            
            // Add value label inside the bar
            if (config.showValues && nodeHeight > 15) {
                const displayValue = usePercentage 
                    ? `${Math.round((data.value / config.leftData.total) * 100)}%`
                    : data.value.toLocaleString();
                    
                g.append('text')
                    .attr('x', rightX + nodeWidth / 2)
                    .attr('y', currentY + nodeHeight / 2 + 4)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '11px')
                    .attr('fill', '#fff')
                    .attr('font-weight', '500')
                    .text(displayValue);
            }
            
            // Add category label to the left of the bar
            g.append('text')
                .attr('x', rightX - 10)
                .attr('y', currentY + nodeHeight / 2)
                .attr('text-anchor', 'end')
                .attr('dominant-baseline', 'middle')
                .style('font-size', '11px')
                .style('font-weight', '500')
                .style('fill', '#fff')
                .text(data.label);
            
            // Draw connection (link)
            const sourceX = leftX + nodeWidth;
            const sourceY = leftY + leftHeight / 2;
            const targetX = rightX;
            const targetY = currentY + nodeHeight / 2;
            const midX = (sourceX + targetX) / 2;
            
            const pathData = `
                M ${sourceX} ${sourceY}
                C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}
            `;
            
            g.append('path')
                .attr('d', pathData)
                .attr('fill', 'none')
                .attr('stroke', config.colors[data.category])
                .attr('stroke-width', Math.max(1, nodeHeight * 0.8))
                .attr('opacity', 0.3);
            
            currentY += nodeHeight + nodeGap;
        });
    }
    
    // ============================================================================
    // TOOLTIP UTILITIES
    // ============================================================================
    
    /**
     * Global tooltip system for consistent tooltips across the application
     */
    const TooltipManager = {
        activeTooltip: null,
        
        /**
         * Create or update a custom tooltip
         * @param {HTMLElement} element - The element to attach tooltip to
         * @param {Object} options - Configuration options
         * @param {string} options.content - HTML content for tooltip
         * @param {string} options.position - Position: 'top', 'bottom', 'left', 'right' (default: 'top')
         * @param {number} options.offset - Offset from element in pixels (default: 10)
         * @param {string} options.className - Additional CSS class for styling
         */
        attach: function(element, options = {}) {
            const {
                content = '',
                position = 'top',
                offset = 10,
                className = ''
            } = options;
            
            // Remove any existing tooltip data
            this.detach(element);
            
            // Create tooltip element
            const tooltip = document.createElement('div');
            tooltip.className = `xymax-tooltip ${className}`;
            tooltip.innerHTML = content;
            tooltip.style.cssText = `
                position: absolute;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 500;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s ease;
                z-index: 10000;
                white-space: nowrap;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.1);
            `;
            
            // Position calculation function
            const updatePosition = (e) => {
                const rect = element.getBoundingClientRect();
                const tooltipRect = tooltip.getBoundingClientRect();
                
                let top, left;
                
                switch(position) {
                    case 'bottom':
                        top = rect.bottom + offset;
                        left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                        break;
                    case 'left':
                        top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                        left = rect.left - tooltipRect.width - offset;
                        break;
                    case 'right':
                        top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                        left = rect.right + offset;
                        break;
                    case 'top':
                    default:
                        top = rect.top - tooltipRect.height - offset;
                        left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                        break;
                }
                
                // Keep tooltip within viewport
                if (left < 10) left = 10;
                if (left + tooltipRect.width > window.innerWidth - 10) {
                    left = window.innerWidth - tooltipRect.width - 10;
                }
                if (top < 10) top = 10;
                if (top + tooltipRect.height > window.innerHeight - 10) {
                    top = window.innerHeight - tooltipRect.height - 10;
                }
                
                tooltip.style.top = `${top}px`;
                tooltip.style.left = `${left}px`;
            };
            
            // Event handlers
            const showTooltip = (e) => {
                if (!tooltip.parentNode) {
                    document.body.appendChild(tooltip);
                }
                updatePosition(e);
                requestAnimationFrame(() => {
                    tooltip.style.opacity = '1';
                });
                this.activeTooltip = tooltip;
            };
            
            const hideTooltip = () => {
                tooltip.style.opacity = '0';
                setTimeout(() => {
                    if (tooltip.parentNode) {
                        tooltip.parentNode.removeChild(tooltip);
                    }
                }, 200);
                if (this.activeTooltip === tooltip) {
                    this.activeTooltip = null;
                }
            };
            
            // Attach event listeners
            element.addEventListener('mouseenter', showTooltip);
            element.addEventListener('mouseleave', hideTooltip);
            element.addEventListener('mousemove', updatePosition);
            
            // Store cleanup function on element
            element._xymax_tooltip_cleanup = () => {
                element.removeEventListener('mouseenter', showTooltip);
                element.removeEventListener('mouseleave', hideTooltip);
                element.removeEventListener('mousemove', updatePosition);
                hideTooltip();
            };
            
            // Store tooltip reference
            element._xymax_tooltip = tooltip;
        },
        
        /**
         * Remove tooltip from element
         * @param {HTMLElement} element - The element to remove tooltip from
         */
        detach: function(element) {
            if (element._xymax_tooltip_cleanup) {
                element._xymax_tooltip_cleanup();
                delete element._xymax_tooltip_cleanup;
                delete element._xymax_tooltip;
            }
        },
        
        /**
         * Update tooltip content without recreating it
         * @param {HTMLElement} element - The element with tooltip
         * @param {string} content - New HTML content
         */
        updateContent: function(element, content) {
            if (element._xymax_tooltip) {
                element._xymax_tooltip.innerHTML = content;
            }
        },
        
        /**
         * Remove all active tooltips
         */
        clearAll: function() {
            const tooltips = document.querySelectorAll('.xymax-tooltip');
            tooltips.forEach(tooltip => {
                if (tooltip.parentNode) {
                    tooltip.parentNode.removeChild(tooltip);
                }
            });
            this.activeTooltip = null;
        }
    };
    
    // ============================================================================
    // PUBLIC API
    // ============================================================================
    
    return {
        // Configuration
        config: config,
        
        // State
        state: state,
        
        // Data loading
        loadData: loadData,
        
        // Sankey diagrams
        drawTemporalSankey: drawTemporalSankey,
        drawComparisonSankey: drawComparisonSankey,
        drawTwoColumnSankey: drawTwoColumnSankey,
        
        // Tooltip system
        tooltip: TooltipManager,
        
        // Utilities
        clearTooltips: clearTooltips,
        getResponsiveNodeWidth: getResponsiveNodeWidth
    };
})();

// Make XYMAX globally available
window.XYMAX = XYMAX;
