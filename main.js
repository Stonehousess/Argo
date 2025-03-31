// Argo Football Ticker - main.js

document.addEventListener("DOMContentLoaded", () => {
  const API_KEY = "3"; // TheSportsDB API key
  const TEAM_ID = "133836"; // Updated Plymouth Argyle ID
  const CHAMPIONSHIP_ID = "4329";
  let lastRefresh = 0;

  // Auto-refresh every 5 minutes
  setInterval(() => {
    const now = Date.now();
    if (now - lastRefresh > 300000) fetchAll();
  }, 10000);

  document.getElementById("refresh-button")?.addEventListener("click", () => {
    const now = Date.now();
    if (now - lastRefresh > 60000) fetchAll();
  });

  function fetchAll() {
    lastRefresh = Date.now();
    fetchUpcoming();
    fetchPrevious();
    fetchLineups();
  }

  function fetchUpcoming() {
    fetch(`https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventsnext.php?id=${TEAM_ID}`)
      .then(res => res.json())
      .then(data => {
        const events = (data.events || []).slice(0, 5);
        const ticker = document.getElementById("top-ticker");
        if (ticker) {
          ticker.innerText = events.map(e => `${e.dateEvent} - ${e.strHomeTeam} vs ${e.strAwayTeam}`).join("   ●   ");
        }
      });
  }

  function fetchPrevious() {
    fetch(`https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventslast.php?id=${TEAM_ID}`)
      .then(res => res.json())
      .then(data => {
        const events = (data.results || []).slice(0, 5);
        const summaries = events.map(event => {
          const result = `${event.dateEvent} - ${event.strHomeTeam} ${event.intHomeScore} : ${event.intAwayScore} ${event.strAwayTeam}`;
          const scorers = [event.strHomeGoalDetails, event.strAwayGoalDetails].filter(Boolean).join(" | ");
          const extra = [];
          if (scorers) extra.push("Scorers: " + scorers);
          if (event.strVideo) extra.push(`Match Report: ${event.strVideo}`);
          return [result, ...extra].join("  •  ");
        });

        const ticker = document.getElementById("bottom-ticker");
        if (ticker) {
          ticker.innerText = summaries.join("   ●   ");
        }
      });
  }

  function fetchLineups() {
    fetch(`https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventslast.php?id=${TEAM_ID}`)
      .then(res => res.json())
      .then(data => {
        const event = data.results?.[0];
        if (!event) return;

        const plyLogo = document.getElementById("plymouth-logo");
        const oppLogo = document.getElementById("opponent-logo");
        if (plyLogo) plyLogo.src = `https://www.thesportsdb.com/images/media/team/badge/vwxupr1422195529.png`;
        if (oppLogo && event.strAwayTeamBadge) oppLogo.src = event.strHomeTeam === "Plymouth Argyle" ? event.strAwayTeamBadge : event.strHomeTeamBadge;

        return fetch(`https://www.thesportsdb.com/api/v1/json/${API_KEY}/lookupevent.php?id=${event.idEvent}`);
      })
      .then(res => res.json())
      .then(data => {
        const event = data.events?.[0];
        if (!event) return;
        renderLineup("plymouth-lineup", event.strHomeLineupForward, event.strHomeLineupMidfield, event.strHomeLineupDefense, event.strHomeLineupGoalkeeper);
        renderLineup("opponent-lineup", event.strAwayLineupForward, event.strAwayLineupMidfield, event.strAwayLineupDefense, event.strAwayLineupGoalkeeper);
      });
  }

  function renderLineup(containerId, forwards, mids, defs, gk) {
    const container = document.querySelector(`#${containerId} ul`);
    if (!container) return;
    container.innerHTML = "";
    [...(forwards?.split("; ") || []), ...(mids?.split("; ") || []), ...(defs?.split("; ") || []), ...(gk?.split("; ") || [])].forEach(name => {
      const li = document.createElement("li");
      li.textContent = name;
      container.appendChild(li);
    });
  }

  // Initial load
  fetchAll();
});
