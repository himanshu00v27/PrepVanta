/* ===================================
   PREPVANTA AUTH GUARD

   Included at the very top of <head> on every protected page so the
   redirect fires before the page has a chance to render. Only Home,
   Login and Register stay public — everything else requires a session.
=================================== */

(function () {
    var loggedIn = localStorage.getItem("prepvanta-loggedIn") === "true";
    if (!loggedIn) {
        location.href = "login.html";
    }
})();
