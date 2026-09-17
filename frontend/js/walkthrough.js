/* ===================================
   PREPVANTA WALKTHROUGH
=================================== */

(function () {

    if (localStorage.getItem("prepvanta-show-walkthrough") !== "true") {
        return;
    }

    const STEPS = [
        {
            title: "Welcome to PrepVanta 👋",
            desc: "Your one-stop placement prep platform — aptitude, reasoning, technical topics, mock interviews and a live compiler, all in one place.",
            target: null
        },

        {
            title: "Your side menu",
            desc: "Use this menu anytime to access Dashboard, Interview Practice, Companies, Search Users and Help Desk.",
            target: "#menuBtn"
        },

        {
            title: "Search topics",
            desc: "Looking for a specific topic? Use the search bar to quickly find what you need.",
            target: ".search-box"
        },

        {
            title: "Switch theme",
            desc: "Prefer dark mode? Toggle between light and dark mode anytime.",
            target: ".theme-toggle"
        },

        {
            title: "Your profile",
            desc: "Open your dashboard from here to see your account details and preparation progress.",
            target: ".profile-btn"
        },

        {
            title: "Explore Topics",
            desc: "Explore DSA, DBMS, Web Development, Operating Systems, Programming Languages and Core CS topics.",
            target: '.nav-links a[href="topics.html"]'
        },

        {
            title: "Practice Aptitude",
            desc: "Practice aptitude questions by topic and strengthen the skills commonly tested in placement exams.",
            target: '.nav-links a[href="aptitude.html"]'
        },

        {
            title: "Practice Reasoning",
            desc: "Improve your logical and analytical reasoning through focused practice.",
            target: '.nav-links a[href="reasoning.html"]'
        },

        {
            title: "Try the Compiler",
            desc: "Write and run code directly in your browser without installing a local development environment.",
            target: '.nav-links a[href="compiler.html"]'
        },

        {
            title: "Interview Practice",
            desc: "Prepare for interviews with mock tests, written questions and coding practice.",
            target: '.sidebar a[href="interview.html"]',
            needsSidebar: true
        },

        {
            title: "Company-specific Prep",
            desc: "Explore company-focused preparation and get familiar with the types of questions asked by recruiters.",
            target: '.sidebar a[href="companies.html"]',
            needsSidebar: true
        },

        {
            title: "Search Users",
            desc: "Find other PrepVanta users using their username or user ID.",
            target: '.sidebar a[href="search-users.html"]',
            needsSidebar: true
        },

        {
            title: "Help Desk",
            desc: "Need help? Visit the Help Desk for FAQs and support options.",
            target: '.sidebar a[href="help-desk.html"]',
            needsSidebar: true
        },

        {
            title: "Your progress",
            desc: "Your dashboard keeps your preparation information and progress in one place. You're ready to start practicing!",
            target: ".profile-card",
            needsSidebar: false
        }
    ];

    let stepIndex = 0;
    let overlay = null;
    let highlightBox = null;
    let tooltip = null;
    let renderTimer = null;

    function getTarget(selector) {
        return document.querySelector(selector);
    }

    function clearOverlayElements() {

        if (renderTimer) {
            clearTimeout(renderTimer);
            renderTimer = null;
        }

        if (overlay) overlay.remove();
        if (highlightBox) highlightBox.remove();
        if (tooltip) tooltip.remove();

        overlay = null;
        highlightBox = null;
        tooltip = null;
    }

    function buildTooltipHTML(step, index) {

        const isFirst = index === 0;
        const isLast = index === STEPS.length - 1;

        const dots = STEPS
            .map((_, i) => {
                return `<span class="${i === index ? "wt-dot-active" : ""}"></span>`;
            })
            .join("");

        return `
            <div class="wt-step-count">
                Step ${index + 1} of ${STEPS.length}
            </div>

            <div class="wt-title">
                ${step.title}
            </div>

            <div class="wt-desc">
                ${step.desc}
            </div>

            <div class="wt-dots">
                ${dots}
            </div>

            <div class="wt-actions">

                <button
                    type="button"
                    class="wt-skip"
                    id="wtSkip">
                    Skip tour
                </button>

                <div class="wt-nav-btns">

                    ${
                        isFirst
                            ? ""
                            : `
                                <button
                                    type="button"
                                    class="wt-btn wt-btn-back"
                                    id="wtBack">
                                    Back
                                </button>
                              `
                    }

                    <button
                        type="button"
                        class="wt-btn wt-btn-next"
                        id="wtNext">
                        ${isLast ? "Finish" : "Next"}
                    </button>

                </div>

            </div>
        `;
    }

    function createOverlay() {

        overlay = document.createElement("div");

        overlay.className = "wt-plain-overlay";

        document.body.appendChild(overlay);
    }

    function createHighlight(rect) {

        highlightBox = document.createElement("div");

        highlightBox.className = "wt-highlight";

        highlightBox.style.top =
            `${rect.top - 8}px`;

        highlightBox.style.left =
            `${rect.left - 8}px`;

        highlightBox.style.width =
            `${rect.width + 16}px`;

        highlightBox.style.height =
            `${rect.height + 16}px`;

        document.body.appendChild(highlightBox);
    }

    function positionTooltip(rect) {

        const margin = 18;

        const viewportWidth =
            window.innerWidth;

        const viewportHeight =
            window.innerHeight;

        const tooltipWidth =
            tooltip.offsetWidth;

        const tooltipHeight =
            tooltip.offsetHeight;

        /*
            Try below the feature first.
        */

        let top =
            rect.bottom + margin;

        /*
            If there isn't enough room below,
            place it above.
        */

        if (
            top + tooltipHeight >
            viewportHeight - margin
        ) {

            top =
                rect.top -
                tooltipHeight -
                margin;
        }

        /*
            Keep tooltip inside viewport vertically.
        */

        top = Math.max(
            margin,
            Math.min(
                top,
                viewportHeight -
                tooltipHeight -
                margin
            )
        );

        /*
            Align tooltip with the target.
        */

        let left = rect.left;

        /*
            Prevent it from going off the right side.
        */

        if (
            left + tooltipWidth >
            viewportWidth - margin
        ) {

            left =
                viewportWidth -
                tooltipWidth -
                margin;
        }

        /*
            Prevent it from going off the left side.
        */

        left = Math.max(
            margin,
            left
        );

        tooltip.style.top =
            `${top}px`;

        tooltip.style.left =
            `${left}px`;
    }

    function renderCentered(step, index) {

        createOverlay();

        tooltip =
            document.createElement("div");

        tooltip.className =
            "wt-tooltip wt-centered";

        tooltip.innerHTML =
            buildTooltipHTML(
                step,
                index
            );

        document.body.appendChild(
            tooltip
        );

        wireControls();
    }

    function renderTarget(step, index, target) {

        /*
            Scroll the actual feature into view.
            "nearest" prevents unnecessary page jumps.
        */

        target.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest"
        });

        /*
            Wait for the browser to finish scrolling
            before measuring the element.
        */

        renderTimer = setTimeout(() => {

            const rect =
                target.getBoundingClientRect();

            if (
                rect.width === 0 ||
                rect.height === 0
            ) {

                renderCentered(
                    step,
                    index
                );

                return;
            }

            createHighlight(rect);

            tooltip =
                document.createElement("div");

            tooltip.className =
                "wt-tooltip";

            tooltip.innerHTML =
                buildTooltipHTML(
                    step,
                    index
                );

            document.body.appendChild(
                tooltip
            );

            positionTooltip(rect);

            wireControls();

        }, 450);
    }

    function wireControls() {

        const skipBtn =
            document.getElementById(
                "wtSkip"
            );

        const backBtn =
            document.getElementById(
                "wtBack"
            );

        const nextBtn =
            document.getElementById(
                "wtNext"
            );

        if (skipBtn) {

            skipBtn.addEventListener(
                "click",
                endTour
            );
        }

        if (backBtn) {

            backBtn.addEventListener(
                "click",
                () => {

                    goToStep(
                        stepIndex - 1
                    );

                }
            );
        }

        if (nextBtn) {

            nextBtn.addEventListener(
                "click",
                () => {

                    if (
                        stepIndex ===
                        STEPS.length - 1
                    ) {

                        endTour();

                    } else {

                        goToStep(
                            stepIndex + 1
                        );

                    }

                }
            );
        }
    }

    function renderStep(index) {

        clearOverlayElements();

        stepIndex =
            Math.max(
                0,
                Math.min(
                    index,
                    STEPS.length - 1
                )
            );

        const step =
            STEPS[stepIndex];

        /*
            Open/close sidebar automatically.
        */

        if (
            typeof openSidebar === "function" &&
            typeof closeSidebar === "function"
        ) {

            if (step.needsSidebar) {

                openSidebar();

            } else {

                closeSidebar();

            }
        }

        /*
            Give sidebar time to open.
        */

        const startRender = () => {

            if (!step.target) {

                renderCentered(
                    step,
                    stepIndex
                );

                return;
            }

            const target =
                getTarget(
                    step.target
                );

            if (!target) {

                renderCentered(
                    step,
                    stepIndex
                );

                return;
            }

            renderTarget(
                step,
                stepIndex,
                target
            );
        };

        if (step.needsSidebar) {

            renderTimer =
                setTimeout(
                    startRender,
                    400
                );

        } else {

            startRender();

        }
    }

    function goToStep(index) {

        renderStep(index);
    }

    function endTour() {

        clearOverlayElements();

        localStorage.setItem(
            "prepvanta-show-walkthrough",
            "false"
        );

        if (
            typeof closeSidebar === "function"
        ) {

            closeSidebar();

        }

        document.body.style.overflow =
            "";
    }

    /*
        ESC closes the walkthrough.
    */

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                tooltip
            ) {

                endTour();

            }

        }
    );

    /*
        Recalculate position if the
        browser window changes size.
    */

    window.addEventListener(
        "resize",
        () => {

            if (tooltip) {

                renderStep(
                    stepIndex
                );

            }

        }
    );

    /*
        Start after dashboard has loaded.
    */

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            setTimeout(
                () => {
                    goToStep(0);
                },
                700
            );

        }
    );

})();