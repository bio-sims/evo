/**
 * @file Contains dropdown button class for creating dropdown buttons in the UI
 * @author Zachary Mullen
 * @module dropdownButton
 */

export default class DropdownButton {
    /**
     * Create a dropdown button
     * @param {element} element - the element to attach the dropdown to
     * @param {Array<Object<{text: string, callback: Function}>>} list - list of objects with display text and a callback function
     * @param {boolean} closeOnClick - if choosing from the list should close the dropdown
     * @param {boolean} above - if the list should appear above the button
     * @param {boolean} left - if the list should appear left-aligned
     */
    constructor(element, list, { closeOnClick = true, above = false, left = false } = {}) {
        this.list = list;
        this.closeOnClick = closeOnClick;
        this.above = above;
        this.left = left;
        this.isOpen = false;
        this.button = element;
        this.button.addEventListener("click", () => this.toggleList());

        // initialize dropdown
        this.dropdown = document.createElement("div");
        this.dropdown.classList.add("dropdown-content");
        this.list.forEach((item) => {
            const button = document.createElement("button");
            button.classList.add("icon-button");
            button.innerHTML = item.text;
            // initial set tab index to -1 to prevent tabbing to hidden elements
            button.setAttribute("tabindex", "-1");

            // add icon to button
            const launchSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            launchSvg.setAttribute("viewBox", "0 0 24 24");
            launchSvg.setAttribute("fill", "currentColor");
            if (item.link) {
                launchSvg.innerHTML = `<path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3z"></path>`;
            } else {
                launchSvg.innerHTML = `<path d="M16.59 9H15V4c0-.55-.45-1-1-1h-4c-.55 0-1 .45-1 1v5H7.41c-.89 0-1.34 1.08-.71 1.71l4.59 4.59c.39.39 1.02.39 1.41 0l4.59-4.59c.63-.63.19-1.71-.7-1.71M5 19c0 .55.45 1 1 1h12c.55 0 1-.45 1-1s-.45-1-1-1H6c-.55 0-1 .45-1 1"></path>`;
            }
            button.prepend(launchSvg);

            // initialize button click with callback
            button.addEventListener("click", () => {
                item.callback();
                if (closeOnClick) this.toggleList(false);
            });
            this.dropdown.appendChild(button);
        });
        this.button.appendChild(this.dropdown);

        // close dropdown when unfocused
        window.addEventListener("click", (e) => {
            if (this.isOpen) this.toggleList(e.composedPath().includes(this.dropdown) || e.composedPath().includes(this.button));
        });
    }

    /**
     * Toggle the dropdown list
     * @param {boolean} open - if the list should be open or closed
     */
    toggleList(open = !this.isOpen) {
        this.isOpen = open;
        if (this.dropdown) {
            if (this.above) {
                this.dropdown.style.bottom = `${this.button.offsetHeight + 4}px`;
            } else {
                this.dropdown.style.top = `${this.button.offsetHeight + 4}px`;
            }
            if (this.left) {
                this.dropdown.style.left = "0";
                this.dropdown.style.right = "auto";
            } else {
                this.dropdown.style.left = "auto";
                this.dropdown.style.right = "0";
            }
            this.dropdown.classList.toggle("show", this.isOpen);
        }
        // set tab index to 0 for visible elements
        if (this.isOpen) {
            this.dropdown.querySelectorAll("button").forEach((button) => button.setAttribute("tabindex", "0"));
            this.dropdown.querySelector("button").focus();
        } else {
            this.dropdown.querySelectorAll("button").forEach((button) => button.setAttribute("tabindex", "-1"));
            this.button.focus();
        }
    }
}
