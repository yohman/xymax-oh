class YearSlider {
    constructor() {
        this.years = xymax.defaults.years;
        this.startYear = xymax.defaults.defaultStartYear;
        this.endYear = xymax.defaults.defaultEndYear;
        this.startIndex = this.years.indexOf(this.startYear);
        this.endIndex = this.years.indexOf(this.endYear);
        this.isDragging = false;
        this.activeHandle = null;
        
        this.init();
    }
    
    init() {
        this.createStops();
        this.createLabels();
        this.updateHandlePositions();
        this.updateRange();
        this.bindEvents();
    }
    
    createStops() {
        const slider = document.querySelector('.year-slider');
        this.years.forEach((year, index) => {
            const stop = document.createElement('div');
            stop.className = 'slider-stop';
            stop.style.left = `${(index / (this.years.length - 1)) * 100}%`;
            stop.dataset.index = index;
            slider.appendChild(stop);
        });
    }
    
    createLabels() {
        const labelsContainer = document.getElementById('slider-labels');
        this.years.forEach(year => {
            const label = document.createElement('div');
            label.className = 'slider-label';
            label.textContent = year;
            labelsContainer.appendChild(label);
        });
    }
    
    updateHandlePositions() {
        const startHandle = document.getElementById('start-handle');
        const endHandle = document.getElementById('end-handle');
        
        startHandle.style.left = `${(this.startIndex / (this.years.length - 1)) * 100}%`;
        endHandle.style.left = `${(this.endIndex / (this.years.length - 1)) * 100}%`;
    }
    
    updateRange() {
        const range = document.getElementById('slider-range');
        const startPercent = (this.startIndex / (this.years.length - 1)) * 100;
        const endPercent = (this.endIndex / (this.years.length - 1)) * 100;
        
        range.style.left = `${startPercent}%`;
        range.style.width = `${endPercent - startPercent}%`;
    }
    
    bindEvents() {
        const startHandle = document.getElementById('start-handle');
        const endHandle = document.getElementById('end-handle');
        const slider = document.querySelector('.year-slider');
        
        // Handle mouse down events
        startHandle.addEventListener('mousedown', (e) => this.startDrag(e, 'start'));
        endHandle.addEventListener('mousedown', (e) => this.startDrag(e, 'end'));
        
        // Global mouse events
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.stopDrag());
        
        // Click on stops to move nearest handle
        document.querySelectorAll('.slider-stop').forEach(stop => {
            stop.addEventListener('click', (e) => this.jumpToStop(e));
        });
    }
    
    startDrag(e, handleType) {
        e.preventDefault();
        this.isDragging = true;
        this.activeHandle = handleType;
    }
    
    drag(e) {
        if (!this.isDragging || !this.activeHandle) return;
        
        const slider = document.querySelector('.year-slider');
        const rect = slider.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const newIndex = Math.round(percent * (this.years.length - 1));
        
        if (this.activeHandle === 'start') {
            this.startIndex = Math.min(newIndex, this.endIndex - 1);
            this.startYear = this.years[this.startIndex];
        } else {
            this.endIndex = Math.max(newIndex, this.startIndex + 1);
            this.endYear = this.years[this.endIndex];
        }
        
        this.updateHandlePositions();
        this.updateRange();
        this.onYearChange();
    }
    
    stopDrag() {
        this.isDragging = false;
        this.activeHandle = null;
    }
    
    jumpToStop(e) {
        const stopIndex = parseInt(e.target.dataset.index);
        const startDistance = Math.abs(stopIndex - this.startIndex);
        const endDistance = Math.abs(stopIndex - this.endIndex);
        
        if (startDistance <= endDistance) {
            this.startIndex = Math.min(stopIndex, this.endIndex - 1);
            this.startYear = this.years[this.startIndex];
        } else {
            this.endIndex = Math.max(stopIndex, this.startIndex + 1);
            this.endYear = this.years[this.endIndex];
        }
        
        this.updateHandlePositions();
        this.updateRange();
        this.onYearChange();
    }
    
    onYearChange() {
        // This will be called from map.js when the slider is initialized
        if (window.onSliderYearChange) {
            window.onSliderYearChange(this.startYear, this.endYear);
        }
    }
    
    getYears() {
        return { start: this.startYear, end: this.endYear };
    }
}

// Initialize slider when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.yearSlider = new YearSlider();
});
