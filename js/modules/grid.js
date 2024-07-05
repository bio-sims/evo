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
    constructor(simulation, containerId) {
        this.simulation = simulation;
        this.hares = {};
        this.container = document.getElementById(containerId);
        this.grid = [];
        this.initializeGrid();
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

        // create the tooltip element placeholder, needed for nice CSS animations
        // consider creating the element on hover if performance is an issue and just do a fade in
        const tooltip = document.createElement("div");
        tooltip.classList.add("tooltip");
        const tooltipImage = element.cloneNode(true);
        const tooltipContent = document.createElement("div");
        tooltipContent.classList.add("tooltip-content");
        tooltip.appendChild(tooltipImage);
        tooltip.appendChild(tooltipContent);
        element.appendChild(tooltip);

        // update tooltip content only on mouseover (performance optimization)
        element.addEventListener("mouseover", (e) => {
            // reset inline styles initially
            tooltip.style.left = "";
            tooltip.style.right = "";
            // get the hare and the tooltip content
            const hare = this.hares[id];
            const tooltipContent = tooltip.querySelector(".tooltip-content");
            const tooltipImage = tooltip.querySelector(".grid-hare");
            // reuse the already present element, but remove the tooltip to avoid recursion
            const tooltipStrippedHare = element.cloneNode(true);
            tooltipStrippedHare.classList.add("grid-hare--large");
            tooltipStrippedHare.querySelector(".tooltip").remove();
            tooltipImage.replaceWith(tooltipStrippedHare);
            // update the tooltip content based on the hare
            tooltipContent.innerHTML = `
                <span><b>Alelle 1:</b> ${hare.alleles[0].name} (${hare.alleles[0].type})</span>
                <span><b>Alelle 2:</b> ${hare.alleles[1].name} (${hare.alleles[1].type})</span>
                <span><b>Whiteness:</b> ${Math.round(hare.whiteness * 100)}%</span>
                <span><b>Alive:</b> ${hare.alive ? "Yes" : "No"}</span>
            `;
            if (hare.alive) {
                tooltipContent.innerHTML += `<span><b>Mismatched:</b> ${hare.isMismatched(this.simulation.snowCoverage) ? "Yes" : "No"}</span>`;
            } else {
                tooltipContent.innerHTML += `<span><b>Died mismatched:</b> ${hare.wasMismatched ? "Yes" : "No"}</span>`;
            }
            // move the tooltip to the right if itʻs overflowing the left side of the screen
            const toolTipBounds = tooltip.getBoundingClientRect();
            const gridItemBounds = element.getBoundingClientRect();
            console.log(gridItemBounds, toolTipBounds);
            if (toolTipBounds.left < 0) {
                tooltip.style.left = `${0 - gridItemBounds.left}px`;
                tooltip.style.right = "auto";
            }
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
            if (oldHare && hare.equals(oldHare) && oldHare.wasMismatched === hare.isMismatched(this.simulation.snowCoverage)) {
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
}
