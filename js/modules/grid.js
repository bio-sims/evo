/**
 * @file Grid class definition and methods for the simulation grid
 * @author Zachary Mullen
 * @module grid
 */

// hare element
const hare = () => {
    const element = document.createElement("div");
    element.classList.add("grid-hare");
    return element;
}

export default class Grid {
    /**
     * Represents a grid for the simulation
     * @param {Simulation} simulation - the simulation to represent
     * @param {string} containerId - the id of the container element for the grid
     */
    constructor(simulation, containerId) {
        this.simulation = simulation;
        this.container = document.getElementById(containerId);
        this.grid = [];
        this.initializeGrid();
    }
    /**
     * Initialize the grid with hare elements
     */
    initializeGrid() {
        // remove all children
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
        for (let i = 0; i < this.simulation.carryingCapacity; i++) {
            const hareElement = hare();
            this.container.appendChild(hareElement);
        }
    }
    /**
     * Update the grid with the current state of the simulation
     */
    updateGrid() {
        // use the hare id as the index for the grid
        if (!this.simulation.hares) {
            return;
        }
        this.simulation.hares.forEach((hare) => {
            if (!hare || hare.id === -1) {
                return;
            }
            const hareElement = this.container.children[hare.id];
            if (hare.alive) {
                hareElement.style.backgroundColor = hare.getGenotypeColor();
                if (hare.isMismatched(this.simulation.snowCoverage)) {
                    hareElement.classList.add("grid-hare--mismatch");
                } else {
                    hareElement.classList.remove("grid-hare--mismatch");
                }
            } else {
                // ensure the mismatch class is removed
                hareElement.classList.remove("grid-hare--mismatch");

                hareElement.style.backgroundColor = "transparent";
                hareElement.classList.add("grid-hare--dead");
            }
        });
    }
}
