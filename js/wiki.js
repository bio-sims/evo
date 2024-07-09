import { setupTheme, toggleTheme, getThemeIconData } from "./modules/theme.js";

function main() {
    const navHamburger = document.getElementById('nav-toggle');
    const headerContents = document.getElementById('header-contents');

    // open/close nav
    navHamburger.addEventListener('click', () => {
        if (headerContents.attributes['data-closed'] !== undefined) {
            headerContents.removeAttribute('data-closed');
        } else {
            headerContents.setAttribute('data-closed', '');
        }
    });

    // close nav when a link is clicked
    const wikiLinks = document.getElementsByClassName('wiki-link');
    for (let i = 0; i < wikiLinks.length; i++) {
        wikiLinks[i].addEventListener('click', () => {
            headerContents.setAttribute('data-closed', '');
        });
    }

    const handleToggleTheme = () => {
        toggleTheme();
        const themeIconSmall = document.getElementById('theme-icon-path-small');
        const themeIconLarge = document.getElementById('theme-icon-path-large');
        themeIconSmall.setAttribute('d', getThemeIconData());
        themeIconLarge.setAttribute('d', getThemeIconData());
    }

    // set up theme
    setupTheme();
    document.getElementById('theme-icon-path-small').setAttribute('d', getThemeIconData());
    document.getElementById('theme-icon-path-large').setAttribute('d', getThemeIconData());
    document.getElementById('theme-toggle-large').addEventListener('click', handleToggleTheme);
    document.getElementById('theme-toggle-small').addEventListener('click', handleToggleTheme);
}

main();
