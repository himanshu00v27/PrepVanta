const SUPPORT_API = "http://localhost:5000/api/support";

const ticketList = document.getElementById("ticketList");
const statusFilter = document.getElementById("ticketStatusFilter");

const ticketDetail = document.getElementById("ticketDetail");
const ticketDetailEmpty = document.getElementById("ticketDetailEmpty");

const newTicketBtn = document.getElementById("newTicketBtn");
const ticketModal = document.getElementById("ticketModal");
const ticketModalBackdrop = document.getElementById("ticketModalBackdrop");
const closeTicketModal = document.getElementById("closeTicketModal");
const cancelTicketBtn = document.getElementById("cancelTicketBtn");

const ticketForm = document.getElementById("ticketForm");
const ticketFormMessage = document.getElementById("ticketFormMessage");

const replyForm = document.getElementById("ticketReplyForm");
const replyMessage = document.getElementById("ticketReplyMessage");
const replyStatus = document.getElementById("replyStatus");
const adminTicketControls = document.getElementById("adminTicketControls");
const adminTicketStatus = document.getElementById("adminTicketStatus");

let tickets = [];
let selectedTicketId = null;
const currentUser = JSON.parse(localStorage.getItem("prepvanta-user") || "{}");

const isAdmin = currentUser.role === "admin";

/* ===================================
   AUTH
=================================== */

function getToken() {
  return localStorage.getItem("prepvanta-token");
}

function authHeaders(includeContentType = false) {
  const token = getToken();

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

/* ===================================
   LOAD TICKETS
=================================== */

async function loadTickets() {
  try {
    ticketList.innerHTML = `
            <div class="ticket-empty">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <p>Loading your tickets...</p>
            </div>
        `;

    const ticketsUrl = isAdmin
      ? `${SUPPORT_API}/admin/tickets`
      : `${SUPPORT_API}/tickets`;

    const response = await fetch(ticketsUrl, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error("Unable to load tickets");
    }

    tickets = await response.json();

    updateSummary();
    renderTicketList();
  } catch (error) {
    console.error("Ticket loading error:", error);

    ticketList.innerHTML = `
            <div class="ticket-empty">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>Unable to load your support tickets.</p>
            </div>
        `;
  }
}

/* ===================================
   SUMMARY
=================================== */

function updateSummary() {
  document.getElementById("openTicketCount").textContent = tickets.filter(
    (ticket) => ticket.status === "open",
  ).length;

  document.getElementById("progressTicketCount").textContent = tickets.filter(
    (ticket) => ticket.status === "in_progress",
  ).length;

  document.getElementById("resolvedTicketCount").textContent = tickets.filter(
    (ticket) => ticket.status === "resolved",
  ).length;

  document.getElementById("totalTicketCount").textContent = tickets.length;
}

/* ===================================
   RENDER TICKET LIST
=================================== */

function renderTicketList() {
  const filter = statusFilter.value;

  const filteredTickets =
    filter === "all"
      ? tickets
      : tickets.filter((ticket) => ticket.status === filter);

  if (!filteredTickets.length) {
    ticketList.innerHTML = `
            <div class="ticket-empty">
                <i class="fa-regular fa-folder-open"></i>
                <p>No tickets found.</p>
            </div>
        `;

    return;
  }

  ticketList.innerHTML = filteredTickets
    .map((ticket) => {
      const active = ticket._id === selectedTicketId ? "active" : "";

      return `
                <div
                    class="ticket-list-item ${active}"
                    data-ticket-id="${escapeHtml(ticket._id)}"
                >

                    <div class="ticket-item-top">

                        <h3>
                            ${escapeHtml(ticket.subject)}
                        </h3>

                        <span class="ticket-item-date">
                            ${formatDate(ticket.updatedAt)}
                        </span>

                    </div>

                    <p class="ticket-item-description">
                        ${escapeHtml(ticket.description)}
                    </p>

                    <div class="ticket-item-meta">

                        <span
                            class="ticket-status status-${escapeHtml(ticket.status)}"
                        >
                            ${formatStatus(ticket.status)}
                        </span>

                        <span class="ticket-badge">
                            ${escapeHtml(ticket.category)}
                        </span>

                        <span class="ticket-badge">
                            ${escapeHtml(ticket.priority)}
                        </span>

                    </div>

                </div>
            `;
    })
    .join("");

  document.querySelectorAll(".ticket-list-item").forEach((item) => {
    item.addEventListener("click", () => {
      openTicket(item.dataset.ticketId);
    });
  });
}

/* ===================================
   OPEN TICKET
=================================== */

async function openTicket(ticketId) {
  try {
    const ticketUrl = isAdmin
      ? `${SUPPORT_API}/admin/tickets/${ticketId}`
      : `${SUPPORT_API}/tickets/${ticketId}`;

    const response = await fetch(ticketUrl, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error("Unable to load ticket");
    }

    const ticket = await response.json();

    selectedTicketId = ticket._id;

    renderTicketList();
    renderTicketDetail(ticket);
  } catch (error) {
    console.error("Ticket detail error:", error);
  }
}

/* ===================================
   RENDER TICKET DETAIL
=================================== */

function renderTicketDetail(ticket) {
  ticketDetailEmpty.hidden = true;
  ticketDetail.hidden = false;

  document.getElementById("detailSubject").textContent = ticket.subject;

  document.getElementById("detailDescription").textContent = ticket.description;

  document.getElementById("detailCategory").textContent = ticket.category;

  document.getElementById("detailPriority").textContent =
    `${ticket.priority} priority`;

  document.getElementById("detailCreatedAt").textContent =
    `Created ${formatDateTime(ticket.createdAt)}`;

  const statusElement = document.getElementById("detailStatus");

  statusElement.textContent = formatStatus(ticket.status);

  statusElement.className = `ticket-status status-${ticket.status}`;

  if (isAdmin) {
    adminTicketControls.hidden = false;
    adminTicketStatus.value = ticket.status;
  } else {
    adminTicketControls.hidden = true;
  }
  const repliesLocked =
    ticket.status === "resolved" || ticket.status === "closed";

  if (repliesLocked) {
    replyMessage.disabled = true;
    replyMessage.placeholder =
      "This ticket is resolved. Reopen the ticket to continue the conversation.";

    replyForm.querySelector('button[type="submit"]').disabled = true;
  } else {
    replyMessage.disabled = false;
    replyMessage.placeholder = "Write a reply...";

    replyForm.querySelector('button[type="submit"]').disabled = false;
  }

  renderMessages(ticket.messages || []);
}

/* ===================================
   MESSAGES
=================================== */

function renderMessages(messages) {
  const messageList = document.getElementById("messageList");

  if (!messages.length) {
    messageList.innerHTML = `
            <div class="ticket-empty">
                <p>No replies yet.</p>
            </div>
        `;

    return;
  }

  messageList.innerHTML = messages
    .map((message) => {
      const sender = message.sender || {};

      /*
       * Admin messages appear on the support side.
       * Normal user messages appear on the user side.
       */
      const currentUser = JSON.parse(
        localStorage.getItem("prepvanta-user") || "{}",
      );

      const isCurrentUser = sender.userId === currentUser.userId;

      const senderName = isCurrentUser
        ? "You"
        : sender.role === "admin"
          ? "PrepVanta Support"
          : sender.fullName || "User";
      return `
                <div class="ticket-message ${isCurrentUser ? "user" : "support"}">

                    <div class="message-bubble">
                        ${escapeHtml(message.message)}
                    </div>

                    <div class="message-meta">
                        ${escapeHtml(senderName)}
                        ·
                        ${formatDateTime(message.createdAt)}
                    </div>

                </div>
            `;
    })
    .join("");

  messageList.scrollTop = messageList.scrollHeight;
}

/* ===================================
   CREATE TICKET
=================================== */

ticketForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const subject = document.getElementById("ticketSubject").value.trim();

  const description = document.getElementById("ticketDescription").value.trim();

  const category = document.getElementById("ticketCategory").value;

  const priority = document.getElementById("ticketPriority").value;

  if (!subject || !description) {
    ticketFormMessage.textContent = "Subject and description are required.";

    return;
  }

  try {
    ticketFormMessage.textContent = "Submitting ticket...";

    const response = await fetch(`${SUPPORT_API}/tickets`, {
      method: "POST",

      headers: authHeaders(true),

      body: JSON.stringify({
        subject,
        description,
        category,
        priority,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to create ticket");
    }

    ticketForm.reset();

    closeModal();

    await loadTickets();

    if (data.ticket?._id) {
      await openTicket(data.ticket._id);
    }
  } catch (error) {
    ticketFormMessage.textContent = error.message;
  }
});

/* ===================================
   SEND USER REPLY
=================================== */

replyForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!selectedTicketId) {
    return;
  }

  const message = replyMessage.value.trim();

  if (!message) {
    return;
  }

  try {
    replyStatus.textContent = "Sending...";

    const replyUrl = isAdmin
      ? `${SUPPORT_API}/admin/tickets/${selectedTicketId}/messages`
      : `${SUPPORT_API}/tickets/${selectedTicketId}/messages`;

    const response = await fetch(replyUrl, {
      method: "POST",

      headers: authHeaders(true),

      body: JSON.stringify({
        message,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to send reply");
    }

    replyMessage.value = "";
    replyStatus.textContent = "";

    await loadTickets();
    await openTicket(selectedTicketId);
  } catch (error) {
    replyStatus.textContent = error.message;
  }
});

/* ===================================
   ADMIN UPDATE TICKET STATUS
=================================== */

adminTicketStatus.addEventListener("change", async () => {
  if (!isAdmin || !selectedTicketId) {
    return;
  }

  const status = adminTicketStatus.value;

  try {
    adminTicketStatus.disabled = true;

    const response = await fetch(
      `${SUPPORT_API}/admin/tickets/${selectedTicketId}/status`,
      {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify({
          status,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to update ticket status");
    }

    await loadTickets();
    await openTicket(selectedTicketId);
  } catch (error) {
    console.error("Ticket status update error:", error);
  } finally {
    adminTicketStatus.disabled = false;
  }
});

/* ===================================
   MODAL
=================================== */

function openModal() {
  ticketModal.classList.add("active");
  ticketModal.setAttribute("aria-hidden", "false");

  document.body.style.overflow = "hidden";

  document.getElementById("ticketSubject").focus();
}

function closeModal() {
  ticketModal.classList.remove("active");
  ticketModal.setAttribute("aria-hidden", "true");

  document.body.style.overflow = "";

  ticketFormMessage.textContent = "";
}

newTicketBtn.addEventListener("click", openModal);

closeTicketModal.addEventListener("click", closeModal);

cancelTicketBtn.addEventListener("click", closeModal);

ticketModalBackdrop.addEventListener("click", closeModal);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && ticketModal.classList.contains("active")) {
    closeModal();
  }
});

/* ===================================
   FILTER
=================================== */

statusFilter.addEventListener("change", renderTicketList);

/* ===================================
   HELPERS
=================================== */

function formatStatus(status) {
  if (status === "in_progress") {
    return "In Progress";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ===================================
   INITIALIZE
=================================== */

loadTickets();
