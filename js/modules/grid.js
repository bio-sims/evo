/**
 * @file Grid class definition and methods for the simulation grid
 * @author Zachary Mullen
 * @module grid
 */

export default class Grid {
    /**
     * Represents a grid for the simulation
     * @param {Simulation} simulation - the simulation to represent
     * @param {string} containerId - the id of the container element for the grid
    */
    static MIN_SIZE = 32;
    static MAX_SIZE = 80;
    constructor(simulation, containerId) {
        this.simulation = simulation;
        this.hares = {};
        this.container = document.getElementById(containerId);
        this.initializeGrid();

        // mouse over updates the tooltip position to mouse position
        this.container.addEventListener("mouseover", (e) => {
            this.tooltip.style.position = "fixed";
            this.tooltip.style.top = `${e.clientY}px`;
            // if the tool tip will go off the right side of the screen, move it to the left
            if (e.clientX + this.tooltip.clientWidth > window.innerWidth) {
                // if it can't go left, attach to the left side of the screen
                if (e.clientX - this.tooltip.clientWidth < 0) {
                    this.tooltip.style.left = "0";
                    this.tooltip.style.right = "auto";
                } else {
                    // otherwise, attach to the left side of the mouse
                    this.tooltip.style.right = `${window.innerWidth - e.clientX}px`;
                    this.tooltip.style.left = "auto";
                }
            } else {
                // otherwise, attach to the right side of the mouse
                this.tooltip.style.left = `${e.clientX}px`;
                this.tooltip.style.right = "auto";
            }
        });

        this.previousWidth = this.container.clientWidth;
        window.addEventListener("resize", () => {
            if (this.container.clientWidth !== this.previousWidth) {
                this.previousWidth = this.container.clientWidth;
                this.resizeHares();
            }
        });

        // create the tooltip element
        this.tooltip = document.createElement("div");
        this.tooltip.classList.add("tooltip");
        this.container.appendChild(this.tooltip);

        this.tooltipImage = document.createElement("div");
        this.tooltipImage.classList.add("grid-hare");
        this.tooltipImage.classList.add("grid-hare--large");
        this.tooltip.appendChild(this.tooltipImage);

        this.tooltipContent = document.createElement("div");
        this.tooltipContent.classList.add("tooltip-content");
        this.tooltip.appendChild(this.tooltipContent);

        this.tooltip.style.position = "fixed";
    }
    /**
     * Update tooltip content and image based on the hovered hare
     * @param {Event} e - the mouseover event
     * @param {number} id - the id of the hare to update the tooltip for
     */
    handleUpdateTooltip(e, id) {
        const hare = this.hares[id];
        const sortedAlleles = [...hare.alleles].sort((a, b) => a.id - b.id);
        // update the tooltip content based on the hare
        this.tooltipContent.innerHTML = `
            <span><b>Alelle 1:</b> ${sortedAlleles[0].name} (${sortedAlleles[0].type})</span>
            <span><b>Alelle 2:</b> ${sortedAlleles[1].name} (${sortedAlleles[1].type})</span>
            <span><b>Whiteness:</b> ${Math.round(hare.whiteness * 100)}%</span>
            <span><b>Alive:</b> ${hare.alive ? "Yes" : "No"}</span>
        `;
        // replace the tooltip image with the current hare
        const hareImageContent = this.container.querySelector(`.grid-hare[data-id="${id}"]`).cloneNode(true);
        this.tooltipImage.innerHTML = "";
        for (let i = 0; i < hareImageContent.children.length; i++) {
            this.tooltipImage.appendChild(hareImageContent.children[i].cloneNode(true));
        }
        if (hare.alive) {
            this.tooltipContent.innerHTML += `<span><b>Mismatched:</b> ${hare.isMismatched(this.simulation.snowCoverage) ? "Yes" : "No"}</span>`;
            this.tooltipImage.classList.toggle("grid-hare--mismatch", hare.isMismatched(this.simulation.snowCoverage));
        } else {
            this.tooltipContent.innerHTML += `<span><b>Died mismatched:</b> ${hare.wasMismatched ? "Yes" : "No"}</span>`;
            this.tooltipImage.classList.toggle("grid-hare--mismatch", hare.wasMismatched);
        }
        this.tooltipImage.classList.toggle("grid-hare--dead", !hare.alive);
    }
    /**
     * Generate an element representing a hare
     * @param {number} id - the id of the hare the element represents
     * @returns {HTMLElement} - the element representing the hare
     */
    makeHareElement(id) {
        const element = document.createElement("div");
        element.classList.add("grid-hare");
        element.dataset.id = id;

        // create the alleles and whiteness elements
        const firstAllele = document.createElement("div");
        firstAllele.classList.add("hare-allele");
        const secondAllele = document.createElement("div");
        secondAllele.classList.add("hare-allele");

        const whiteness = document.createElement("div");
        whiteness.classList.add("hare-whiteness");

        // add the elements to the grid-hare element
        element.appendChild(firstAllele);
        element.appendChild(whiteness);
        element.appendChild(secondAllele);

        // update tooltip content only on mouseover (performance optimization)
        element.addEventListener("mouseover", (e) => {
            this.handleUpdateTooltip(e, id);
        });
        return element;
    };
    /**
     * Initialize the grid with hare elements
     */
    initializeGrid() {
        // remove all children
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
        for (let i = 0; i < this.simulation.carryingCapacity; i++) {
            const hareElement = this.makeHareElement(i);
            this.container.appendChild(hareElement);
        }
        this.doTick();
        this.updateGrid();
    }
    /**
     * Updates internal state of the grid to match the simulation state
     */
    doTick() {
        this.simulation.hares.forEach((hare) => {
            const oldHare = this.hares[hare.id];
            // if the hare is the same as before, don't update
            if (oldHare && hare.equals(oldHare) && oldHare.wasMismatched === hare.isMismatched(this.simulation.snowCoverage)) {
                return;
            }
            // dont update an already dead hare, as mismatch status should not change
            if (oldHare && !oldHare.alive && !hare.alive) {
                return;
            }
            let hareCopy = Object.assign(Object.create(Object.getPrototypeOf(hare)), hare);
            hareCopy.wasMismatched = hare.isMismatched(this.simulation.snowCoverage);
            hareCopy.shouldUpdate = true;
            this.hares[hare.id] = hareCopy;
        });
    }
    /**
     * Update the grid display with the current internal state, NOT the simulation state
     */
    updateGrid() {
        this.resizeHares();
        Object.values(this.hares).forEach((storedHare) => {
            if (!storedHare.shouldUpdate) return;
            const hareElement = this.container.children[storedHare.id];
            const firstAllele = hareElement.children[0];
            const secondAllele = hareElement.children[2];
            const whiteness = hareElement.children[1];

            let sortedAlleles = [...storedHare.alleles].sort((a, b) => a.id - b.id);
            // set the background color of the alleles
            firstAllele.style.backgroundColor = sortedAlleles[0].geneColor;
            secondAllele.style.backgroundColor = sortedAlleles[1].geneColor;
            // set the background color of the whiteness, between brown and white
            whiteness.style.backgroundColor = `hsla(37, 100%, ${30 + (70 * storedHare.whiteness)}%, 1)`; // brown to white
            // update the classes based on the state of the hare
            hareElement.classList.toggle("grid-hare--dead", !storedHare.alive);
            hareElement.classList.toggle("grid-hare--mismatch", storedHare.wasMismatched);

            // if currently hovered during an update, send another mouseover event to update the tooltip
            if (hareElement.matches(":hover")) {
                hareElement.dispatchEvent(new Event("mouseover"));
            }
        });
    }
    /**
     * Resizes the hares in the grid display.
     * @param {number} containerHeight - the height of the container element
     */
    resizeHares() {
        if (this.container.children.length === 0) return;
        const containerMaxHeight = parseFloat(getComputedStyle(this.container).maxHeight);
        const containerWidth = this.container.clientWidth;
        const containerGap = parseFloat(getComputedStyle(this.container).gap);

        // run binary search to find maximum size that doesn't cause overflow
        let left = Grid.MIN_SIZE;
        let right = Grid.MAX_SIZE;
        let middle = Math.floor((left + right) / 2);
        while (left < right - 1) {
            const totalItemHeight = middle + containerGap;
            const numRows = Math.ceil(this.container.children.length / Math.floor(containerWidth / totalItemHeight));
            if (numRows * totalItemHeight <= containerMaxHeight) {
                left = middle;
            } else {
                right = middle;
            }
            middle = Math.floor((left + right) / 2);
        }

        let newSize = middle;
        this.container.style.gridTemplateColumns = `repeat(auto-fill, minmax(${newSize}px, 1fr))`;
        // set the width and height of the hare elements
        for (let element of this.container.children) {
            if (!element.classList.contains("grid-hare")) continue;
            element.style.width = `${newSize}px`;
            element.style.height = `${newSize}px`;
        }
    }
}
