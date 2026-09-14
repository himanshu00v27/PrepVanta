/* ===================================
   PREPVANTA WALKTHROUGH SCRIPT

   Runs once, right after registration, on dashboard.html. Highlights
   the real navbar/sidebar elements as it introduces each feature.
   Opens/closes the sliding sidebar automatically for the steps that
   live inside it (Interview Practice, Companies, Help Desk).
=================================== */

(function () {

    if (localStorage.getItem("prepvanta-show-walkthrough") !== "true") return;

    const STEPS = [
        {
            title: "Welcome to PrepVanta 👋",
            desc: "Your one-stop placement prep platform — aptitude, reasoning, technical topics, mock interviews and a live compiler, all in one place.",
            target: null
        },
        {
            title: "The side menu",
            desc: "Tap here anytime to jump to your Dashboard, Interview Practice, Companies, Find Users, or Help Desk — from any page.",
            target: "#menuBtn"
        },
        {
            title: "Switch theme",
            desc: "Prefer dark mode? Toggle it anytime — your choice is remembered.",
            target: ".theme-toggle"
        },
        {
            title: "Your profile",
            desc: "This takes you straight to your Dashboard — your account, progress and stats live here.",
            target: ".profile-btn"
        },
        {
            title: "Explore Topics",
            desc: "DSA, DBMS, Web Development, Operating Systems, Programming Languages, Core CS (including System Design) — pick a subject, drill into a specific topic.",
            target: '.nav-links a[href="topics.html"]'
        },
        {
            title: "Practice Aptitude & Reasoning",
            desc: "Pick a topic and get Objective, Subjective and Coding tabs so you can practice however suits you.",
            target: '.nav-links a[href="aptitude.html"]'
        },
        {
            title: "Try the Compiler",
            desc: "Write and run code right in your browser — no setup needed.",
            target: '.nav-links a[href="compiler.html"]'
        },
        {
            title: "Interview Practice",
            desc: "Mock tests live under Objective. Written and coding questions live together under Subjective.",
            target: '.sidebar a[href="interview.html"]',
            needsSidebar: true
        },
        {
            title: "Company-specific Prep",
            desc: "Prepping for a specific company? Get question patterns tuned to how TCS, Infosys, Wipro and others actually hire.",
            target: '.sidebar a[href="companies.html"]',
            needsSidebar: true
        },
        {
            title: "Help Desk",
            desc: "Stuck on something? Help Desk has FAQs and ways to reach support, accessible anytime from the side menu.",
            target: '.sidebar a[href="help-desk.html"]',
            needsSidebar: true
        },
        {
            title: "Track your progress",
            desc: "Your dashboard shows questions solved, mock test history and topic-wise progress. You're all set — happy practicing!",
            target: ".profile-card",
            needsSidebar: false
        }
    ];

    let stepIndex = 0;
    let overlay = null;
    let highlightBox = null;
    let tooltip = null;

    function getVisibleRect(selector) {
        const el = document.querySelector(selector);
        if (!el) return null;
        // if this target lives inside a scrollable container (e.g. the
        // sidebar), make sure it's actually scrolled into view first —
        // otherwise its rect can land off-screen and strand the tooltip
        el.scrollIntoView({ block: "center", behavior: "auto" });
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return null;
        return rect;
    }

    function clearOverlayElements() {
        [overlay, highlightBox, tooltip].forEach(el => el && el.remove());
        overlay = null;
        highlightBox = null;
        tooltip = null;
    }

    function buildTooltipHTML(step, index) {
        const isFirst = index === 0;
        const isLast = index === STEPS.length - 1;
        const dots = STEPS.map((_, i) => `<span class="${i === index ? "wt-dot-active" : ""}"></span>`).join("");

        return `
            <div class="wt-step-count">Step ${index + 1} of ${STEPS.length}</div>
            <div class="wt-title">${step.title}</div>
            <div class="wt-desc">${step.desc}</div>
            <div class="wt-dots">${dots}</div>
            <div class="wt-actions">
                <button type="button" class="wt-skip" id="wtSkip">Skip tour</button>
                <div class="wt-nav-btns">
                    ${isFirst ? "" : '<button type="button" class="wt-btn wt-btn-back" id="wtBack">Back</button>'}
                    <button type="button" class="wt-btn wt-btn-next" id="wtNext">${isLast ? "Finish" : "Next"}</button>
                </div>
            </div>
        `;
    }

    function positionTooltipNear(rect, tooltipEl) {
        const margin = 16;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const tw = tooltipEl.offsetWidth;
        const th = tooltipEl.offsetHeight;

        let top = rect.bottom + margin;
        if (top + th > vh - margin) {
            top = rect.top - th - margin;
        }
        // hard clamp: whatever placement was chosen above, never let the
        // tooltip render partly or fully outside the viewport
        top = Math.max(margin, Math.min(top, vh - th - margin));

        let left = rect.left;
        if (left + tw > vw - margin) left = vw - tw - margin;
        left = Math.max(margin, left);

        tooltipEl.style.top = top + "px";
        tooltipEl.style.left = left + "px";
    }

    function renderCentered(step, index) {
        overlay = document.createElement("div");
        overlay.className = "wt-plain-overlay";
        document.body.appendChild(overlay);

        tooltip = document.createElement("div");
        tooltip.className = "wt-tooltip wt-centered";
        tooltip.innerHTML = buildTooltipHTML(step, index);
        document.body.appendChild(tooltip);

        wireControls();
    }

    function renderOnTarget(step, index, rect) {
        highlightBox = document.createElement("div");
        highlightBox.className = "wt-highlight";
        highlightBox.style.top = (rect.top - 6) + "px";
        highlightBox.style.left = (rect.left - 6) + "px";
        highlightBox.style.width = (rect.width + 12) + "px";
        highlightBox.style.height = (rect.height + 12) + "px";
        document.body.appendChild(highlightBox);

        tooltip = document.createElement("div");
        tooltip.className = "wt-tooltip";
        tooltip.innerHTML = buildTooltipHTML(step, index);
        document.body.appendChild(tooltip);

        positionTooltipNear(rect, tooltip);

        wireControls();
    }

    function wireControls() {
        const skipBtn = document.getElementById("wtSkip");
        const backBtn = document.getElementById("wtBack");
        const nextBtn = document.getElementById("wtNext");

        if (skipBtn) skipBtn.addEventListener("click", endTour);
        if (backBtn) backBtn.addEventListener("click", () => goToStep(stepIndex - 1));
        if (nextBtn) {
            nextBtn.addEventListener("click", () => {
                if (stepIndex === STEPS.length - 1) {
                    endTour();
                } else {
                    goToStep(stepIndex + 1);
                }
            });
        }
    }

    function renderStep(index) {
        clearOverlayElements();
        const step = STEPS[index];

        if (typeof openSidebar === "function" && typeof closeSidebar === "function") {
            if (step.needsSidebar) {
                openSidebar();
            } else {
                closeSidebar();
            }
        }

        const render = () => {
            if (!step.target) {
                renderCentered(step, index);
                return;
            }
            const rect = getVisibleRect(step.target);
            if (!rect) {
                renderCentered(step, index);
                return;
            }
            renderOnTarget(step, index, rect);
        };

        // give the sidebar's slide animation a moment to finish before measuring it
        if (step.needsSidebar) {
            setTimeout(render, 380);
        } else {
            render();
        }
    }

    function goToStep(index) {
        stepIndex = Math.max(0, Math.min(index, STEPS.length - 1));
        renderStep(stepIndex);
    }

    function endTour() {
        localStorage.setItem("prepvanta-show-walkthrough", "false");
        clearOverlayElements();
        if (typeof closeSidebar === "function") closeSidebar();
        document.body.style.overflow = "";
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && tooltip) endTour();
    });

    window.addEventListener("resize", () => {
        if (tooltip) renderStep(stepIndex);
    });

    document.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => goToStep(0), 500);
    });

})();
