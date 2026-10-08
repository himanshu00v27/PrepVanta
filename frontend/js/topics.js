/* ===================================
   PREPVANTA TOPICS SCRIPT
=================================== */

document.querySelectorAll(".tgroup-head").forEach(head => {
    head.addEventListener("click", () => {
        head.parentElement.classList.toggle("open");
    });
});

// ===================================
// TOPIC SEARCH FILTER
// ===================================

const topicQuery = new URLSearchParams(window.location.search)
    .get("q")?.trim().toLowerCase() || "";

if (topicQuery) {
    const groups = document.querySelectorAll(".topic-tree .tgroup");
    let totalMatches = 0;

    groups.forEach(group => {
        const heading = group.querySelector(".tgroup-head span");
        const links = group.querySelectorAll(".tgroup-items a");

        const headingMatches = heading?.textContent
            .toLowerCase().includes(topicQuery) || false;

        let groupMatches = 0;

        links.forEach(link => {
            const matches = headingMatches ||
                link.textContent.toLowerCase().includes(topicQuery);

            link.style.display = matches ? "" : "none";

            if (matches) groupMatches++;
        });

        group.style.display = groupMatches > 0 ? "" : "none";

        if (groupMatches > 0) {
            group.classList.add("open");
            totalMatches += groupMatches;
        }
    });

    if (totalMatches === 0) {
        const message = document.createElement("p");
        message.textContent = "No matching topics found.";
        message.style.padding = "20px";
        document.querySelector(".topic-tree").appendChild(message);
    }
}
