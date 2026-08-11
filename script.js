/* =========================================================
   PRELOADER
========================================================= */

window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        // Add a minimum display time to prevent flashing on fast connections
        setTimeout(() => {
            preloader.classList.add('hidden');
        }, 2500); // 2500ms (2.5 seconds) minimum

        // Optional: remove from DOM after transition
        preloader.addEventListener('transitionend', () => {
            preloader.remove();
        });
    }
});

/* =========================================================
   UNIQUE DORRIX VENTURES
   Main JavaScript
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       ELEMENTS
    ===================================================== */

    const navbar = document.getElementById("navbar");

    const menuBtn = document.getElementById("menuBtn");
    const mobileMenu = document.getElementById("mobileMenu");

    const mobileLinks = document.querySelectorAll(".mobile-link");

    const mobileCategories =
        document.querySelectorAll(".mobile-category");

    const backToTopBtn =
        document.getElementById("backToTopBtn");


    /* =====================================================
       NAVBAR SCROLL EFFECT
    ===================================================== */

    function handleNavbarScroll() {

        if (window.scrollY > 40) {
            navbar.classList.add("scrolled");
        } else {
            navbar.classList.remove("scrolled");
        }

    }

    window.addEventListener(
        "scroll",
        handleNavbarScroll,
        { passive: true }
    );

    handleNavbarScroll();


    /* =====================================================
       MOBILE MENU
    ===================================================== */

    function openMobileMenu() {

        mobileMenu.classList.add("active");

        document.body.classList.add("menu-open");

        menuBtn.setAttribute(
            "aria-expanded",
            "true"
        );

        menuBtn.setAttribute(
            "aria-label",
            "Close menu"
        );

        menuBtn.innerHTML = "×";

    }


    function closeMobileMenu() {

        mobileMenu.classList.remove("active");

        document.body.classList.remove("menu-open");

        menuBtn.setAttribute(
            "aria-expanded",
            "false"
        );

        menuBtn.setAttribute(
            "aria-label",
            "Open menu"
        );

        menuBtn.innerHTML = "☰";

    }


    function toggleMobileMenu() {

        if (mobileMenu.classList.contains("active")) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }

    }


    if (menuBtn) {

        menuBtn.addEventListener(
            "click",
            toggleMobileMenu
        );

    }


    /* =====================================================
       MOBILE SUBMENUS
    ===================================================== */

    mobileCategories.forEach(category => {

        const menuName =
            category.dataset.menu;

        const submenu =
            document.getElementById(
                `${menuName}-submenu`
            );

        const symbol =
            category.querySelector(".menu-symbol");


        function toggleSubmenu() {

            const isOpen =
                submenu.classList.contains("open");


            /* Close every other submenu */

            document
                .querySelectorAll(".mobile-submenu.open")
                .forEach(openMenu => {

                    if (openMenu !== submenu) {
                        openMenu.classList.remove("open");
                    }

                });


            document
                .querySelectorAll(".mobile-category .menu-symbol")
                .forEach(otherSymbol => {

                    if (otherSymbol !== symbol) {
                        otherSymbol.textContent = "+";
                    }

                });


            if (isOpen) {

                submenu.classList.remove("open");

                symbol.textContent = "+";

            } else {

                submenu.classList.add("open");

                symbol.textContent = "−";

            }

        }


        category.addEventListener(
            "click",
            toggleSubmenu
        );


        /* Keyboard accessibility */

        category.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {

                    event.preventDefault();

                    toggleSubmenu();

                }

            }
        );

    });


    /* =====================================================
       CLOSE MOBILE MENU WHEN LINK IS CLICKED
    ===================================================== */

    mobileLinks.forEach(link => {

        link.addEventListener(
            "click",
            () => {

                closeMobileMenu();

            }
        );

    });


    /* =====================================================
       ESCAPE KEY
    ===================================================== */

    document.addEventListener(
        "keydown",
        event => {

            if (event.key !== "Escape") {
                return;
            }


            if (
                mobileMenu.classList.contains("active")
            ) {

                closeMobileMenu();

            }

        }
    );


    /* =====================================================
       FILTERING LOGIC
    ===================================================== */

    function setupFiltering(filterNavId, cardSelector) {
        const filterNav = document.getElementById(filterNavId);
        if (!filterNav) return;

        const filterLinks = filterNav.querySelectorAll("a");
        const cards = document.querySelectorAll(cardSelector);

        if (filterLinks.length === 0 || cards.length === 0) return;

        filterLinks.forEach(link => {
            link.addEventListener("click", event => {
                event.preventDefault();

                /* Update active link */
                filterLinks.forEach(l =>
                    l.classList.remove("active")
                );
                link.classList.add("active");

                const filter = link.dataset.filter;

                /* Filter products */
                cards.forEach(card => {
                    const categories = card.dataset.category.split(' ');
                    const shouldShow =
                        filter === "all" ||
                        categories.includes(filter);

                    if (shouldShow) {
                        card.style.display = "";
                    } else {
                        card.style.display = "none";
                    }
                });
            });
        });
    }

    // Setup for Shop Page
    setupFiltering("shopFilter", ".product-card");

    // Setup for Collections Page
    setupFiltering("collectionsFilter", ".category-card");

    function applyFilterFromURL() {
        const params = new URLSearchParams(window.location.search);
        const category = params.get('category');
        if (category) {
            const filterLink = document.querySelector(`#shopFilter a[data-filter="${category}"]`);
            if (filterLink) {
                filterLink.click();
            }
        }
    }

    // Apply filter if a category is passed in the URL
    applyFilterFromURL();


    /* =====================================================
       BACK TO TOP BUTTON
    ===================================================== */

    function handleBackToTop() {

        if (window.scrollY > 300) {

            backToTopBtn.classList.add("visible");

        } else {

            backToTopBtn.classList.remove("visible");

        }

    }


    if (backToTopBtn) {

        window.addEventListener(
            "scroll",
            handleBackToTop,
            { passive: true }
        );


        backToTopBtn.addEventListener(
            "click",
            () => {

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

            }
        );

    }

    /* =====================================================
       REVEAL ANIMATIONS
    ===================================================== */

    const revealElements =
        document.querySelectorAll(
            ".section-heading, " +
            ".category-card, " +
            ".product-card, " +
            ".look-card, " +
            ".about-content, " +
            ".value, " +
            ".contact-box"
        );


    revealElements.forEach(
        element => {

            element.classList.add("reveal");

        }
    );


    if ("IntersectionObserver" in window) {

        const revealObserver =
            new IntersectionObserver(
                entries => {

                    entries.forEach(entry => {

                        if (
                            entry.isIntersecting
                        ) {

                            entry.target.classList.add(
                                "visible"
                            );

                            revealObserver.unobserve(
                                entry.target
                            );

                        }

                    });

                },
                {
                    threshold: 0.12,

                    rootMargin:
                        "0px 0px -40px 0px"
                }
            );


        revealElements.forEach(
            element => {

                revealObserver.observe(
                    element
                );

            }
        );

    } else {

        revealElements.forEach(
            element => {

                element.classList.add(
                    "visible"
                );

            }
        );

    }


    /* =====================================================
       PRODUCT CARD INTERACTION
    ===================================================== */

    const productCards =
        document.querySelectorAll(
            ".product-card"
        );


    productCards.forEach(card => {

        card.addEventListener(
            "click",
            () => {

                const productName =
                    card.querySelector(
                        "h3"
                    );


                if (!productName) {
                    return;
                }


                const name =
                    productName.textContent
                        .trim();


                const whatsappNumber = "2348038184891";
                const message = `Hello, I'm interested in the ${name}.`;
                
                // Encode the message for the URL
                const encodedMessage = encodeURIComponent(message);
                
                const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
                
                // Open the link in a new tab
                window.open(whatsappURL, '_blank');

                console.log(
                    `Visitor interested in: ${name}`
                );

            }
        );

    });


    /* =====================================================
       LOOKBOOK CARD INTERACTION
    ===================================================== */

    const lookCards =
        document.querySelectorAll(
            ".look-card"
        );


    lookCards.forEach(card => {

        card.addEventListener(
            "mouseenter",
            () => {

                card.style.cursor = "pointer";

            }
        );

    });


    /* =====================================================
       FETCH NEW ARRIVALS
    ===================================================== */

    // --- Supabase Client Initialization ---
    const SUPABASE_URL = 'https://lucdgfxiowqpprspnssj.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1Y2RnZnhpb3dxcHByc3Buc3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NTE1MjksImV4cCI6MjEwMjAyNzUyOX0._pBradRaLmfAmTz9BERgkE5Fs564ENaqCXyrZuABAXQ';
    let supabase;
    try {
        supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
        console.error("Supabase client not available. Make sure supabase-js is loaded.", e);
    }

    async function loadNewArrivals() {
        const container = document.getElementById("new-arrivals-container");

        if (!container || !supabase) {
            return;
        }

        try {
            const { data: newArrivals, error } = await supabase
                .from('products')
                .select('*')
                .eq('isNewArrival', true)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            if (newArrivals.length === 0) {
                container.innerHTML = "<p>No new arrivals at the moment. Please check back soon!</p>";
                return;
            }

            const productCardsHTML = newArrivals.map(product => {
                return /*html*/`
                    <article class="product-card" data-category="${product.category}">
                        <div class="product-image">
                            <img src="${product.imageSrc}" alt="Image of ${product.name}">
                            ${product.tag ? `<span class="product-tag">${product.tag}</span>` : ''}
                        </div>
                        <div class="product-info">
                            <small>${product.category.toUpperCase()}</small>
                            <h3>${product.name}</h3>
                            <p>Enquire →</p>
                        </div>
                    </article>
                `;
            }).join('');

            container.innerHTML = productCardsHTML;

            // Re-attach event listeners to the newly created cards
            const newCards = container.querySelectorAll('.product-card');
            newCards.forEach(card => {
                card.addEventListener("click", () => {
                    const productNameElement = card.querySelector("h3");
                    if (productNameElement) {
                        const name = productNameElement.textContent.trim();
                        const whatsappNumber = "2348038184891";
                        const message = `Hello, I'm interested in the new arrival: ${name}.`;
                        const encodedMessage = encodeURIComponent(message);
                        const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
                        window.open(whatsappURL, '_blank');
                        console.log(`Visitor interested in: ${name}`);
                    }
                });
            });


        } catch (error) {
            console.error("Could not fetch or load new arrivals:", error);
            container.innerHTML = "<p>Sorry, we couldn't load new arrivals at this time.</p>";
        }
    }

    // Load the new arrivals when the page loads
    loadNewArrivals();


    /* =====================================================
       PREVENT EMPTY SOCIAL LINKS FROM JUMPING
    ===================================================== */

    const emptyLinks =
        document.querySelectorAll(
            'a[href="#"]'
        );


    emptyLinks.forEach(link => {

        const text =
            link.textContent
                .trim()
                .toLowerCase();


        /*
         * These are placeholders for now.
         *
         * Later replace href="#"
         * with the actual Instagram,
         * TikTok, WhatsApp, etc. links.
         */

        if (
            text.includes("instagram") ||
            text.includes("tiktok") ||
            text.includes("whatsapp") ||
            text.includes("whatsapp us")
        ) {

            link.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    console.log(
                        "Add the real social media link here."
                    );

                }
            );

        }

    });


    /* =====================================================
       CONTACT FORM SUBMISSION
    ===================================================== */

    const form = document.getElementById('contactForm');
    const formResult = document.getElementById('form-result');

    if (form && formResult) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(form);
            const object = Object.fromEntries(formData);
            const json = JSON.stringify(object);
            
            formResult.innerHTML = "<h4>Sending...</h4>";
            form.classList.add('hidden');
            formResult.classList.add('visible');

            fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: json
                })
                .then(async (response) => {
                    let jsonResponse = await response.json();
                    if (response.status == 200) {
                        formResult.innerHTML = `
                            <h4>Thank You!</h4>
                            <p>Your message has been sent successfully. We will get back to you soon.</p>
                        `;
                    } else {
                        console.log(response);
                        formResult.innerHTML = `
                            <h4>Something went wrong.</h4>
                            <p>${jsonResponse.message}</p>
                        `;
                    }
                })
                .catch(error => {
                    console.log(error);
                    formResult.innerHTML = "<h4>Something went wrong.</h4><p>There was an error sending your message.</p>";
                })
                .then(function() {
                    setTimeout(() => {
                        form.reset();
                        form.classList.remove('hidden');
                        formResult.classList.remove('visible');
                        formResult.innerHTML = '';
                    }, 5000); // Reset form after 5 seconds
                });
        });
    }


    /* =====================================================
       WINDOW RESIZE
    ===================================================== */

    window.addEventListener(
        "resize",
        () => {

            /*
             * If the screen becomes desktop size,
             * close the mobile menu.
             */

            if (
                window.innerWidth > 900 &&
                mobileMenu.classList.contains("active")
            ) {

                closeMobileMenu();

            }

        }
    );


    /* =====================================================
       INITIAL STATE
    ===================================================== */

    console.log(
        "Unique Dorrix Ventures website loaded successfully."
    );

});