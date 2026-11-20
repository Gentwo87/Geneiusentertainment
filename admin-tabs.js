
/*
  GENEIUS ENTERTAINMENT & MANAGEMENT
  Main Admin Dashboard Tabs

  Adds top-level navigation without modifying
  existing booking, calendar, or Supabase logic.
*/

(() => {
  "use strict";

  const init = () => {
    const app = document.getElementById("app");

    if (!app || document.getElementById("geAdminTabs")) {
      return;
    }

    const calendarPanel = app.querySelector(
      ":scope > .panel"
    );

    const agencyPanel = document.getElementById("agency");
    const studioPanel = document.getElementById("studioPanel");
    const notificationsPanel =
      document.getElementById("notificationsPanel");
    const profilesPanel =
      document.getElementById("publicProfilesPanel");

    // Booking requests remain independently protected by their existing
    // Supabase administrator check. Embed them as a workspace, not as
    // duplicated scripts, to preserve quotations, payments and management.
    const requestsPanel = document.createElement("section");
    requestsPanel.id = "geUnifiedRequests";
    requestsPanel.className = "panel";
    requestsPanel.style.cssText = "padding:0;overflow:hidden;min-height:75vh";

    requestsPanel.innerHTML = `
      <div style="padding:18px 20px;border-bottom:1px solid #393238">
        <h2 style="margin:0 0 6px;color:#dfb65f">Enquiries, Offers, Payments & Contracts</h2>
        <p style="margin:0;color:#b3b0ad">Manage customer enquiries and bookings without leaving the dashboard.</p>
      </div>
      <div id="geRequestsFrameHost" style="min-height:75vh"></div>
    `;
    app.appendChild(requestsPanel);

    const bookingList = document.getElementById("bookingList");
    const monthlyPanel = bookingList?.closest(".panel");

    const sections = [
      {
        id: "calendar",
        label: "Booking Calendar",
        icon: "📅",
        panel: calendarPanel
      },
      {
        id: "agency",
        label: "Agency Management",
        icon: "👥",
        panel: agencyPanel
      },
      {
        id: "studio",
        label: "Artist & Show Studio",
        icon: "🎤",
        panel: studioPanel
      },
      {
        id: "profiles",
        label: "Public Artist Profiles",
        icon: "🖼",
        panel: profilesPanel
      },
      {
        id: "notifications",
        label: "Notifications",
        icon: "🔔",
        panel: notificationsPanel
      },
      {
        id: "requests",
        label: "Enquiries & Contracts",
        icon: "✉",
        panel: requestsPanel
      },
      {
        id: "monthly",
        label: "Bookings This Month",
        icon: "📋",
        panel: monthlyPanel
      }
    ].filter(section => section.panel);

    if (!sections.length) return;

    const style = document.createElement("style");

    style.textContent = `
      #geAdminTabs {
        display: flex;
        flex-wrap: wrap;
        gap: 9px;
        margin-bottom: 22px;
        padding: 15px;
        background: #19191e;
        border: 1px solid #393238;
        border-radius: 14px;
      }

      #geAdminTabs button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 15px;
        background: #27252b;
        color: #e9e1d1;
        border: 1px solid #60523c;
        border-radius: 9px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition:
          background .2s ease,
          border-color .2s ease;
      }

      #geAdminTabs button:hover {
        background: #403629;
        border-color: #dfb65f;
      }

      #geAdminTabs button[aria-selected="true"] {
        background: #dfb65f;
        color: #17120a;
        border-color: #dfb65f;
      }

      #geAdminTabs button:focus-visible {
        outline: 3px solid white;
        outline-offset: 3px;
      }

      #geAdminTabs .ge-tab-icon {
        font-size: 16px;
      }

      #geRequestsFrameHost iframe {
        display: block;
        width: 100%;
        min-height: 85vh;
        border: 0;
        background: #0d0d10;
      }

      #app .ge-admin-tab-hidden {
        display: none !important;
      }

      @media (max-width: 650px) {
        #geAdminTabs {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          padding: 10px;
          gap: 7px;
        }

        #geAdminTabs button {
          font-size: 11px;
          padding: 11px 7px;
          line-height: 1.3;
        }

        #geAdminTabs .ge-tab-icon {
          font-size: 15px;
        }
      }
    `;

    document.head.appendChild(style);

    const nav = document.createElement("nav");

    nav.id = "geAdminTabs";
    nav.setAttribute(
      "aria-label",
      "Geneius Admin Dashboard Sections"
    );

    const buttons = new Map();

    function activate(id) {
      for (const section of sections) {
        const active = section.id === id;

        section.panel.classList.toggle(
          "ge-admin-tab-hidden",
          !active
        );

        const button = buttons.get(section.id);

        if (button) {
          button.setAttribute(
            "aria-selected",
            String(active)
          );

          button.setAttribute(
            "aria-current",
            active ? "page" : "false"
          );
        }
      }

      if (id === "requests") {
        const host = document.getElementById("geRequestsFrameHost");
        if (host && !host.firstChild) {
          const frame = document.createElement("iframe");
          frame.src = "./booking-requests.html";
          frame.title = "Geneius enquiries, offers, payments and contracts";
          frame.loading = "eager";
          host.appendChild(frame);
        }
      }

      if (id === "profiles") {
        // This section is normally hidden until
        // profile data has loaded.
        profilesPanel?.classList.remove("hidden");
      }

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }

    for (const section of sections) {
      const button = document.createElement("button");

      button.type = "button";

      button.innerHTML = `
        <span class="ge-tab-icon"></span>
        <span class="ge-tab-label"></span>
      `;

      button.querySelector(
        ".ge-tab-icon"
      ).textContent = section.icon;

      button.querySelector(
        ".ge-tab-label"
      ).textContent = section.label;

      button.setAttribute(
        "aria-selected",
        "false"
      );

      button.addEventListener(
        "click",
        () => activate(section.id)
      );

      nav.appendChild(button);

      buttons.set(section.id, button);
    }

    app.insertBefore(nav, app.firstChild);

    // Support direct links to the booking workspace while retaining
    // the existing booking calendar as the normal default.
    const requested = new URLSearchParams(location.search).get("section");
    activate(sections.some(section => section.id === requested)
      ? requested : "calendar");

    // Preserve access to all original sections.
    // The original controls and event listeners remain.
  };

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }
})();
