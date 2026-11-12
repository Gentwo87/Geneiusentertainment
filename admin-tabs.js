
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

    // Keep the booking calendar as the default view.
    activate("calendar");

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
