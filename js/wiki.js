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
}

main();
