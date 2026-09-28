const SUPPORT_API = "http://localhost:5000/api/support";

/* ===================================
   ELEMENTS
=================================== */

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

let tickets = [];
let selectedTicketId = null;

/* ===================================
   AUTH
=================================== */

function getToken() {
  return localStorage.getItem("prepvanta-token");
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("prepvanta-user") || "{}");
  } catch (error) {
    return {};
  }
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
   LOAD MY TICKETS
=================================== */

async function loadTickets() {
  if (!ticketList) {
    return;
  }

  try {
    ticketList.innerHTML = `
      <div class="ticket-empty">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <p>Loading your tickets...</p>
      </div>
    `;

    /*
     * IMPORTANT:
     *
     * Help Desk is the requester-facing interface for EVERY
     * authenticated account, including administrators.
     *
     * Therefore it ALWAYS uses the normal user-scoped endpoint.
     * The backend restricts this endpoint to req.user._id.
     *
     * Administrative ticket management belongs exclusively in
     * Admin Support Management.
     */
    const response = await fetch(`${SUPPORT_API}/tickets`, {
      method: "GET",
      headers: authHeaders(),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.message || "Unable to load your support tickets.");
    }

    tickets = Array.isArray(data) ? data : [];

    /*
     * If the currently selected ticket no longer exists in the
     * requester's own ticket collection, clear the selection.
     */
    if (
      selectedTicketId &&
      !tickets.some((ticket) => ticket._id === selectedTicketId)
    ) {
      selectedTicketId = null;
      resetTicketDetail();
    }

    updateSummary();
    renderTicketList();
  } catch (error) {
    console.error("Ticket loading error:", error);

    tickets = [];

    updateSummary();

    ticketList.innerHTML = `
      <div class="ticket-empty">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <p>${escapeHtml(
          error.message || "Unable to load your support tickets.",
        )}</p>
      </div>
    `;
  }
}

/* ===================================
   SUMMARY
=================================== */

function updateSummary() {
  const openCount = document.getElementById("openTicketCount");
  const progressCount = document.getElementById("progressTicketCount");
  const resolvedCount = document.getElementById("resolvedTicketCount");
  const totalCount = document.getElementById("totalTicketCount");

  if (openCount) {
    openCount.textContent = tickets.filter(
      (ticket) => ticket.status === "open",
    ).length;
  }

  if (progressCount) {
    progressCount.textContent = tickets.filter(
      (ticket) => ticket.status === "in_progress",
    ).length;
  }

  if (resolvedCount) {
    resolvedCount.textContent = tickets.filter(
      (ticket) => ticket.status === "resolved",
    ).length;
  }

  if (totalCount) {
    totalCount.textContent = tickets.length;
  }
}

/* ===================================
   RENDER TICKET LIST
=================================== */

function renderTicketList() {
  if (!ticketList || !statusFilter) {
    return;
  }

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
              ${escapeHtml(formatStatus(ticket.status))}
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
   OPEN MY TICKET
=================================== */

async function openTicket(ticketId) {
  if (!ticketId) {
    return;
  }

  try {
    /*
     * ALWAYS use the requester endpoint.
     *
     * Even when the logged-in account is an administrator,
     * Help Desk may only open a ticket owned by that account.
     */
    const response = await fetch(
      `${SUPPORT_API}/tickets/${encodeURIComponent(ticketId)}`,
      {
        method: "GET",
        headers: authHeaders(),
      },
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Unable to load ticket.");
    }

    selectedTicketId = data._id;

    renderTicketList();
    renderTicketDetail(data);
  } catch (error) {
    console.error("Ticket detail error:", error);

    /*
     * A 404 may occur if somebody attempts to access a ticket
     * that does not belong to the current account.
     */
    selectedTicketId = null;

    resetTicketDetail();

    if (ticketDetailEmpty) {
      ticketDetailEmpty.innerHTML = `
        <div class="empty-icon">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>

        <h3>Unable to open ticket</h3>

        <p>
          ${escapeHtml(error.message || "This ticket could not be accessed.")}
        </p>
      `;
    }

    renderTicketList();
  }
}

/* ===================================
   RESET TICKET DETAIL
=================================== */

function resetTicketDetail() {
  if (ticketDetail) {
    ticketDetail.hidden = true;
  }

  if (ticketDetailEmpty) {
    ticketDetailEmpty.hidden = false;

    ticketDetailEmpty.innerHTML = `
      <div class="empty-icon">
        <i class="fa-regular fa-message"></i>
      </div>

      <h3>Select a ticket</h3>

      <p>
        Choose a ticket from the list to view its details
        and conversation.
      </p>
    `;
  }

  if (replyStatus) {
    replyStatus.textContent = "";
  }
}

/* ===================================
   RENDER TICKET DETAIL
=================================== */

function renderTicketDetail(ticket) {
  if (!ticketDetail || !ticketDetailEmpty) {
    return;
  }

  ticketDetailEmpty.hidden = true;
  ticketDetail.hidden = false;

  const subjectElement = document.getElementById("detailSubject");
  const descriptionElement = document.getElementById("detailDescription");
  const categoryElement = document.getElementById("detailCategory");
  const priorityElement = document.getElementById("detailPriority");
  const createdElement = document.getElementById("detailCreatedAt");
  const statusElement = document.getElementById("detailStatus");

  if (subjectElement) {
    subjectElement.textContent = ticket.subject || "";
  }

  if (descriptionElement) {
    descriptionElement.textContent = ticket.description || "";
  }

  if (categoryElement) {
    categoryElement.textContent = ticket.category || "";
  }

  if (priorityElement) {
    priorityElement.textContent = `${ticket.priority || "medium"} priority`;
  }

  if (createdElement) {
    createdElement.textContent = `Created ${formatDateTime(ticket.createdAt)}`;
  }

  if (statusElement) {
    statusElement.textContent = formatStatus(ticket.status);

    statusElement.className = `ticket-status status-${ticket.status || "open"}`;
  }

  /*
   * Requesters cannot change ticket status from Help Desk.
   *
   * Resolved and closed tickets are read-only.
   */
  const repliesLocked =
    ticket.status === "resolved" || ticket.status === "closed";

  const replyButton = replyForm
    ? replyForm.querySelector('button[type="submit"]')
    : null;

  if (replyMessage) {
    replyMessage.disabled = repliesLocked;

    replyMessage.placeholder = repliesLocked
      ? "This ticket is resolved or closed. Replies are no longer available."
      : "Write a reply...";
  }

  if (replyButton) {
    replyButton.disabled = repliesLocked;
  }

  if (replyStatus) {
    replyStatus.textContent = "";
  }

  renderMessages(ticket.messages || []);
}

/* ===================================
   MESSAGES
=================================== */

function renderMessages(messages) {
  const messageList = document.getElementById("messageList");

  if (!messageList) {
    return;
  }

  if (!Array.isArray(messages) || !messages.length) {
    messageList.innerHTML = `
      <div class="ticket-empty">
        <p>No replies yet.</p>
      </div>
    `;

    return;
  }

  const currentUser = getCurrentUser();

  messageList.innerHTML = messages
    .map((message) => {
      const sender = message.sender || {};

      /*
       * senderType is now the authoritative source for deciding
       * which side of the support conversation produced a message.
       *
       * requester = ticket owner using Help Desk
       * support   = administrator using Admin Support Management
       *
       * Account role must NOT be used for this because an
       * administrator can also be a ticket requester.
       */
      let senderType = message.senderType;

      /*
       * Historical compatibility:
       *
       * Older messages were created before senderType existed.
       * For those messages only, fall back to the old sender
       * information so historical conversations remain readable.
       */
      if (senderType !== "requester" && senderType !== "support") {
        const senderMatchesCurrentUser =
          String(sender.userId || sender._id || "") ===
          String(currentUser.userId || currentUser._id || "");

        if (senderMatchesCurrentUser) {
          senderType = "requester";
        } else if (sender.role === "admin") {
          senderType = "support";
        } else {
          senderType = "requester";
        }
      }

      const isRequester = senderType === "requester";

      const senderName = isRequester ? "You" : "PrepVanta Support";

      return `
        <div
          class="ticket-message ${isRequester ? "user" : "support"}"
        >

          <div class="message-bubble">
            ${escapeHtml(message.message || "")}
          </div>

          <div class="message-meta">
            ${escapeHtml(senderName)}
            &middot;
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

if (ticketForm) {
  ticketForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const subject = document.getElementById("ticketSubject").value.trim();

    const description = document
      .getElementById("ticketDescription")
      .value.trim();

    const category = document.getElementById("ticketCategory").value;
    const priority = document.getElementById("ticketPriority").value;

    if (!subject || !description) {
      if (ticketFormMessage) {
        ticketFormMessage.textContent = "Subject and description are required.";
      }

      return;
    }

    try {
      if (ticketFormMessage) {
        ticketFormMessage.textContent = "Submitting ticket...";
      }

      /*
       * Administrators use exactly the same requester endpoint
       * here as normal users.
       */
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

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to create ticket.");
      }

      ticketForm.reset();

      closeModal();

      await loadTickets();

      if (data.ticket?._id) {
        await openTicket(data.ticket._id);
      }
    } catch (error) {
      if (ticketFormMessage) {
        ticketFormMessage.textContent =
          error.message || "Unable to create ticket.";
      }
    }
  });
}

/* ===================================
   SEND REQUESTER REPLY
=================================== */

if (replyForm) {
  replyForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!selectedTicketId || !replyMessage) {
      return;
    }

    const message = replyMessage.value.trim();

    if (!message) {
      return;
    }

    const submitButton = replyForm.querySelector('button[type="submit"]');

    try {
      if (replyStatus) {
        replyStatus.textContent = "Sending...";
      }

      if (submitButton) {
        submitButton.disabled = true;
      }

      /*
       * ALWAYS use the requester message endpoint.
       *
       * The backend verifies that selectedTicketId belongs to
       * req.user._id before accepting the message.
       *
       * Admin replies to other people's tickets belong exclusively
       * in Admin Support Management.
       */
      const response = await fetch(
        `${SUPPORT_API}/tickets/${encodeURIComponent(
          selectedTicketId,
        )}/messages`,
        {
          method: "POST",

          headers: authHeaders(true),

          body: JSON.stringify({
            message,
          }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to send reply.");
      }

      replyMessage.value = "";

      if (replyStatus) {
        replyStatus.textContent = "";
      }

      const ticketId = selectedTicketId;

      await loadTickets();

      await openTicket(ticketId);
    } catch (error) {
      if (replyStatus) {
        replyStatus.textContent = error.message || "Unable to send reply.";
      }

      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
}

/* ===================================
   MODAL
=================================== */

function openModal() {
  if (!ticketModal) {
    return;
  }

  ticketModal.classList.add("active");
  ticketModal.setAttribute("aria-hidden", "false");

  document.body.style.overflow = "hidden";

  const subjectInput = document.getElementById("ticketSubject");

  if (subjectInput) {
    subjectInput.focus();
  }
}

function closeModal() {
  if (!ticketModal) {
    return;
  }

  ticketModal.classList.remove("active");
  ticketModal.setAttribute("aria-hidden", "true");

  document.body.style.overflow = "";

  if (ticketFormMessage) {
    ticketFormMessage.textContent = "";
  }
}

if (newTicketBtn) {
  newTicketBtn.addEventListener("click", openModal);
}

if (closeTicketModal) {
  closeTicketModal.addEventListener("click", closeModal);
}

if (cancelTicketBtn) {
  cancelTicketBtn.addEventListener("click", closeModal);
}

if (ticketModalBackdrop) {
  ticketModalBackdrop.addEventListener("click", closeModal);
}

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    ticketModal &&
    ticketModal.classList.contains("active")
  ) {
    closeModal();
  }
});

/* ===================================
   FILTER
=================================== */

if (statusFilter) {
  statusFilter.addEventListener("change", renderTicketList);
}

/* ===================================
   HELPERS
=================================== */

function formatStatus(status) {
  if (!status) {
    return "Unknown";
  }

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
