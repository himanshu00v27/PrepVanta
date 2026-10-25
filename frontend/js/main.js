/* ===================================
   PREPVANTA MAIN SCRIPT
=================================== */


/* Active Navigation */

const navLinks =
document.querySelectorAll(".nav-links a");

navLinks.forEach(link => {

    link.addEventListener("click", () => {

        navLinks.forEach(item =>
            item.classList.remove("active")
        );

        link.classList.add("active");
    });

});


/* Scroll Navbar Shadow */

const navbar =
document.querySelector(".navbar");

window.addEventListener("scroll", () => {

    if (window.scrollY > 20) {

        navbar.style.boxShadow =
        "0 10px 30px rgba(0,0,0,.08)";

    } else {

        navbar.style.boxShadow = "none";
    }

});


/* Animated Statistics */

const statCards = document.querySelectorAll(".stat-card h2");
let statsAnimated = false;
let statsReady = false;

function animateStats() {
    if (statsAnimated || !statsReady) return;

    const statsSection = document.querySelector(".stats");
    if (!statsSection) return;

    const sectionTop = statsSection.getBoundingClientRect().top;
    if (sectionTop >= window.innerHeight - 100) return;

    statsAnimated = true;

    statCards.forEach(card => {
        const text = card.textContent.trim();
        const target = parseInt(text.replace(/\D/g, ""), 10);

        if (!Number.isFinite(target)) return;

        let count = 0;
        const speed = target / 60;
        const suffix = text.endsWith("+") ? "+" : "";

        const counter = setInterval(() => {
            count += speed;

            if (count >= target) {
                card.textContent = text;
                clearInterval(counter);
            } else {
                card.textContent = Math.floor(count) + suffix;
            }
        }, 20);
    });
}

async function loadPublicStats() {
    try {
        const response = await fetch("/api/stats/public");
        if (!response.ok) throw new Error("Statistics unavailable");

        const data = await response.json();

        if (!Number.isInteger(data.questionCount) ||
            !Number.isInteger(data.topicCount) ||
            data.questionCount < 0 || data.topicCount < 0) {
            throw new Error("Invalid statistics");
        }

        const questions = Math.max(
            100,
            Math.floor(data.questionCount / 100) * 100
        );

        const topics = Math.floor(data.topicCount / 10) * 10;

        document.getElementById("question-stat").textContent =
            questions + "+";

        document.getElementById("topic-stat").textContent =
            data.topicCount < 10 ? String(data.topicCount) : topics + "+";

        statsReady = true;
        animateStats();
    } catch (error) {
        console.error("Unable to load homepage statistics:", error);
    }
}

window.addEventListener("scroll", animateStats);
loadPublicStats();


/* Reveal Animation */

const revealElements =
document.querySelectorAll(
".feature-card, .stat-card, .benefit-card"
);

const observer =
new IntersectionObserver(

(entries) => {

    entries.forEach(entry => {

        if (entry.isIntersecting) {

            entry.target.classList.add("show");
        }

    });

},

{
    threshold:0.15
}

);

revealElements.forEach(el => {

    el.classList.add("hidden");

    observer.observe(el);
});