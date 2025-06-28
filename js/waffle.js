console.log('Loading waffle.js');

// Function to create a waffle chart for land use area
// Takes featureData (GeoJSON properties) and year as parameters
// Returns an SVG string representing the waffle chart
// Uses xymax namespace for colors
function createWaffleChart(featureData, year) {
    const housingCol = `${year}_housing_total_use_area`;
    const officeCol = `${year}_office_total_use_area`;
    const otherCol = `${year}_other_total_use_area`;
    
    const housing = featureData[housingCol] || 0;
    const office = featureData[officeCol] || 0;
    const other = featureData[otherCol] || 0;
    
    const total = housing + office + other;
    
    let housingBoxes, officeBoxes, otherBoxes, emptyBoxes;
    
    if (total === 0) {
        housingBoxes = officeBoxes = otherBoxes = 0;
        emptyBoxes = 100;
    } else {
        housingBoxes = Math.round(housing / total * 100);
        officeBoxes = Math.round(office / total * 100);
        otherBoxes = Math.round(other / total * 100);
        
        // Adjust to ensure exactly 100 boxes
        const totalBoxes = housingBoxes + officeBoxes + otherBoxes;
        if (totalBoxes !== 100) {
            const diff = 100 - totalBoxes;
            if (housing >= office && housing >= other) {
                housingBoxes += diff;
            } else if (office >= other) {
                officeBoxes += diff;
            } else {
                otherBoxes += diff;
            }
        }
        emptyBoxes = 0;
    }
    
    // Create SVG waffle chart - 10x10 grid with 10px boxes
    let svg = '<svg class="waffle-chart">';
    
    // Use colors from xymax namespace
    const colors = xymax.colors.waffle;
    
    // Create sorted array of box types (grouped by category)
    const boxes = [
        ...Array(housingBoxes).fill('housing'),
        ...Array(officeBoxes).fill('office'),
        ...Array(otherBoxes).fill('other'),
        ...Array(emptyBoxes).fill('empty')
    ];
    
    // Draw 10x10 grid with 10px boxes (sorted, not shuffled)
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            const boxType = boxes[i * 10 + j];
            const color = colors[boxType];
            svg += `<rect class="waffle-box" x="${j * 10}" y="${i * 10}" width="9" height="9" fill="${color}"/>`;
        }
    }
    
    svg += '</svg>';
    return svg;
}

function createWaffleLegend() {
    const colors = xymax.colors.waffle;
    
    let legendSvg = '<svg class="waffle-legend">';
    
    const categories = [
        { key: 'housing', label: 'Housing' },
        { key: 'office', label: 'Office' },
        { key: 'other', label: 'Other' }
    ];
    
    categories.forEach((cat, index) => {
        const y = index * 20;
        legendSvg += `<rect class="waffle-legend-box" x="0" y="${y}" width="12" height="12" fill="${colors[cat.key]}"/>`;
        legendSvg += `<text class="waffle-legend-text" x="18" y="${y + 9}">${cat.label}</text>`;
    });
    
    legendSvg += '</svg>';
    return legendSvg;
}

function createWaffleChartLegend(featureData, year) {
    console.log(featureData)
    const housingCol = `${year}_housing_total_use_area`;
    const officeCol = `${year}_office_total_use_area`;
    const otherCol = `${year}_other_total_use_area`;
    
    const housing = featureData[housingCol] || 0;
    const office = featureData[officeCol] || 0;
    const other = featureData[otherCol] || 0;
    
    const total = housing + office + other;
    
    let housingPercent = 0, officePercent = 0, otherPercent = 0;
    
    if (total > 0) {
        housingPercent = Math.round((housing / total) * 100);
        officePercent = Math.round((office / total) * 100);
        otherPercent = Math.round((other / total) * 100);
    }
    
    const colors = xymax.colors.waffle;
    
    return `
        <table style="font-size: 0.8em; margin-top: 8px; width: 100%;">
            <tr>
                <td style="padding: 2px; text-align: left;">
                    <div style="width: 12px; height: 12px; background: ${colors.housing}; display: inline-block; margin-right: 6px;"></div>
                    Housing
                </td>
                <td style="text-align: right; padding: 2px;">${housingPercent}%</td>
            </tr>
            <tr>
                <td style="padding: 2px; text-align: left;">
                    <div style="width: 12px; height: 12px; background: ${colors.office}; display: inline-block; margin-right: 6px;"></div>
                    Office
                </td>
                <td style="text-align: right; padding: 2px;">${officePercent}%</td>
            </tr>
            <tr>
                <td style="padding: 2px; text-align: left;">
                    <div style="width: 12px; height: 12px; background: ${colors.other}; display: inline-block; margin-right: 6px;"></div>
                    Other
                </td>
                <td style="text-align: right; padding: 2px;">${otherPercent}%</td>
            </tr>
        </table>
    `;
}

function createAgeWaffleChart(featureData) {
    const pop_0_14 = featureData.pop_0_14 || 0;
    const pop_15_64 = featureData.pop_15_64 || 0;
    const pop_65_plus = featureData.pop_65_plus || 0;
    
    const total = pop_0_14 + pop_15_64 + pop_65_plus;
    console.log(pop_0_14, pop_15_64, pop_65_plus, total);
    let age0_14Boxes, age15_64Boxes, age65PlusBoxes, emptyBoxes;
    
    if (total === 0) {
        age0_14Boxes = age15_64Boxes = age65PlusBoxes = 0;
        emptyBoxes = 100;
    } else {
        age0_14Boxes = Math.round((pop_0_14 / total) * 100);
        age15_64Boxes = Math.round((pop_15_64 / total) * 100);
        age65PlusBoxes = Math.round((pop_65_plus / total) * 100);
        
        // Adjust to ensure exactly 100 boxes
        const totalBoxes = age0_14Boxes + age15_64Boxes + age65PlusBoxes;
        if (totalBoxes !== 100) {
            const diff = 100 - totalBoxes;
            if (pop_15_64 >= pop_0_14 && pop_15_64 >= pop_65_plus) {
                age15_64Boxes += diff;
            } else if (pop_65_plus >= pop_0_14) {
                age65PlusBoxes += diff;
            } else {
                age0_14Boxes += diff;
            }
        }
        emptyBoxes = 0;
    }
    
    // Create SVG waffle chart - 10x10 grid with 10px boxes
    let svg = '<svg class="waffle-chart">';
    
    // Age demographic colors (graduated)
    const colors = {
        age_0_14: '#64b5f6',    // Light blue for young
        age_15_64: '#388e3c',   // Green for working age
        age_65_plus: '#f57c00', // Orange for elderly
        empty: '#2a2a2a'        // Dark gray
    };
    
    // Create sorted array of box types (grouped by category)
    const boxes = [
        ...Array(age0_14Boxes).fill('age_0_14'),
        ...Array(age15_64Boxes).fill('age_15_64'),
        ...Array(age65PlusBoxes).fill('age_65_plus'),
        ...Array(emptyBoxes).fill('empty')
    ];
    
    // Draw 10x10 grid with 10px boxes (sorted, not shuffled)
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            const boxType = boxes[i * 10 + j];
            const color = colors[boxType];
            svg += `<rect class="waffle-box" x="${j * 10}" y="${i * 10}" width="9" height="9" fill="${color}"/>`;
        }
    }
    
    svg += '</svg>';
    return svg;
}

function createAgeWaffleChartLegend(featureData) {
    const pop_0_14 = featureData.pop_0_14 || 0;
    const pop_15_64 = featureData.pop_15_64 || 0;
    const pop_65_plus = featureData.pop_65_plus || 0;
    
    const total = pop_0_14 + pop_15_64 + pop_65_plus;
    
    let age0_14Percent = 0, age15_64Percent = 0, age65PlusPercent = 0;
    
    if (total > 0) {
        age0_14Percent = Math.round((pop_0_14 / total) * 100);
        age15_64Percent = Math.round((pop_15_64 / total) * 100);
        age65PlusPercent = Math.round((pop_65_plus / total) * 100);
    }
    
    const colors = {
        age_0_14: '#64b5f6',
        age_15_64: '#388e3c',
        age_65_plus: '#f57c00'
    };
    
    return `
        <table style="font-size: 0.8em; margin-top: 8px; width: 100%;">
            <tr>
                <td style="padding: 2px; text-align: left;">
                    <div style="width: 12px; height: 12px; background: ${colors.age_0_14}; display: inline-block; margin-right: 6px;"></div>
                    0-14 years
                </td>
                <td style="text-align: right; padding: 2px;">${age0_14Percent}%</td>
            </tr>
            <tr>
                <td style="padding: 2px; text-align: left;">
                    <div style="width: 12px; height: 12px; background: ${colors.age_15_64}; display: inline-block; margin-right: 6px;"></div>
                    15-64 years
                </td>
                <td style="text-align: right; padding: 2px;">${age15_64Percent}%</td>
            </tr>
            <tr>
                <td style="padding: 2px; text-align: left;">
                    <div style="width: 12px; height: 12px; background: ${colors.age_65_plus}; display: inline-block; margin-right: 6px;"></div>
                    65+ years
                </td>
                <td style="text-align: right; padding: 2px;">${age65PlusPercent}%</td>
            </tr>
        </table>
    `;
}

function createGenderWaffleChart(featureData) {
    const pop_male = featureData.pop_male || 0;
    const pop_female = featureData.pop_female || 0;
    
    const total = pop_male + pop_female;
    
    let maleBoxes, femaleBoxes, emptyBoxes;
    
    if (total === 0) {
        maleBoxes = femaleBoxes = 0;
        emptyBoxes = 100;
    } else {
        maleBoxes = Math.round((pop_male / total) * 100);
        femaleBoxes = Math.round((pop_female / total) * 100);
        
        // Adjust to ensure exactly 100 boxes
        const totalBoxes = maleBoxes + femaleBoxes;
        if (totalBoxes !== 100) {
            const diff = 100 - totalBoxes;
            if (pop_male >= pop_female) {
                maleBoxes += diff;
            } else {
                femaleBoxes += diff;
            }
        }
        emptyBoxes = 0;
    }
    
    // Create SVG waffle chart - 10x10 grid with 10px boxes
    let svg = '<svg class="waffle-chart">';
    
    // Gender demographic colors
    const colors = {
        male: '#42a5f5',        // Blue for male
        female: '#ec407a',      // Pink for female
        empty: '#2a2a2a'        // Dark gray
    };
    
    // Create sorted array of box types (grouped by category)
    const boxes = [
        ...Array(maleBoxes).fill('male'),
        ...Array(femaleBoxes).fill('female'),
        ...Array(emptyBoxes).fill('empty')
    ];
    
    // Draw 10x10 grid with 10px boxes (sorted, not shuffled)
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            const boxType = boxes[i * 10 + j];
            const color = colors[boxType];
            svg += `<rect class="waffle-box" x="${j * 10}" y="${i * 10}" width="9" height="9" fill="${color}"/>`;
        }
    }
    
    svg += '</svg>';
    return svg;
}

function createGenderWaffleChartLegend(featureData) {
    const pop_male = featureData.pop_male || 0;
    const pop_female = featureData.pop_female || 0;
    
    const total = pop_male + pop_female;
    
    let malePercent = 0, femalePercent = 0;
    
    if (total > 0) {
        malePercent = Math.round((pop_male / total) * 100);
        femalePercent = Math.round((pop_female / total) * 100);
    }
    
    const colors = {
        male: '#42a5f5',
        female: '#ec407a'
    };
    
    return `
        <table style="font-size: 0.8em; margin-top: 8px; width: 100%;">
            <tr>
                <td style="padding: 2px; text-align: left;">
                    <div style="width: 12px; height: 12px; background: ${colors.male}; display: inline-block; margin-right: 6px;"></div>
                    Male
                </td>
                <td style="text-align: right; padding: 2px;">${malePercent}%</td>
            </tr>
            <tr>
                <td style="padding: 2px; text-align: left;">
                    <div style="width: 12px; height: 12px; background: ${colors.female}; display: inline-block; margin-right: 6px;"></div>
                    Female
                </td>
                <td style="text-align: right; padding: 2px;">${femalePercent}%</td>
            </tr>
        </table>
    `;
}