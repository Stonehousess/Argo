// Argo Football Ticker - main.js

const API_KEY = "3"; // TheSportsDB API key
const TEAM_ID = "133739"; // Plymouth Argyle ID
const CHAMPIONSHIP_ID = "4329";
let lastRefresh = 0;

// Auto-refresh every 5 minutes
setInterval(() => {
  const now = Date.now();
  if (now - lastRefresh > 300000) fetchAll();
}, 10000);

document.getElementById("refresh-button").addEventListener("click", () => {
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
      const events = data.events || [];
      const ticker = document.getElementById("top-ticker");
      ticker.innerText = events.map(e => `${e.dateEvent} - ${e.strHomeTeam} vs ${e.strAwayTeam}`).join("   ●   ");
    });
}

function fetchPrevious() {
  fetch(`https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventslast.php?id=${TEAM_ID}`)
    .then(res => res.json())
    .then(data => {
      const events = data.results || [];
      const plymouthMatch = events[0];
      const summary = [`${plymouthMatch.dateEvent} - ${plymouthMatch.strHomeTeam} ${plymouthMatch.intHomeScore} : ${plymouthMatch.intAwayScore} ${plymouthMatch.strAwayTeam}`];
      const scorers = [plymouthMatch.strHomeGoalDetails, plymouthMatch.strAwayGoalDetails].filter(Boolean).join(" | ");
      if (scorers) summary.push("Scorers: " + scorers);
      if (plymouthMatch.strVideo) summary.push(`Match Report: ${plymouthMatch.strVideo}`);

      fetch(`https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventsround.php?id=${CHAMPIONSHIP_ID}&r=${plymouthMatch.intRound}&s=${plymouthMatch.strSeason}`)
        .then(res => res.json())
        .then(data => {
          const others = (data.events || []).filter(e => e.idEvent !== plymouthMatch.idEvent).slice(0, 4);
          const otherScores = others.map(e => `${e.strHomeTeam} ${e.intHomeScore} : ${e.intAwayScore} ${e.strAwayTeam}`);
          const ticker = document.getElementById("bottom-ticker");
          ticker.innerText = [...summary, ...otherScores].join("   ●   ");
        });
    });
}

function fetchLineups() {
  fetch(`https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventslast.php?id=${TEAM_ID}`)
    .then(res => res.json())
    .then(data => {
      const event = data.results[0];
      document.getElementById("plymouth-logo").src = `https://www.thesportsdb.com/images/media/team/badge/vwxupr1422195529.png`;
      document.getElementById("opponent-logo").src = event.strAwayTeam === "Plymouth" ? event.strHomeTeamBadge : event.strAwayTeamBadge;
      return fetch(`https://www.thesportsdb.com/api/v1/json/${API_KEY}/lookupevent.php?id=${event.idEvent}`);
    })
    .then(res => res.json())
    .then(data => {
      const event = data.events[0];
      renderLineup("plymouth-lineup", event.strHomeLineupForward, event.strHomeLineupMidfield, event.strHomeLineupDefense, event.strHomeLineupGoalkeeper);
      renderLineup("opponent-lineup", event.strAwayLineupForward, event.strAwayLineupMidfield, event.strAwayLineupDefense, event.strAwayLineupGoalkeeper);
    });
}

function renderLineup(containerId, forwards, mids, defs, gk) {
  const container = document.querySelector(`#${containerId} ul`);
  container.innerHTML = "";
  [...(forwards?.split("; ") || []), ...(mids?.split("; ") || []), ...(defs?.split("; ") || []), ...(gk?.split("; ") || [])].forEach(name => {
    const li = document.createElement("li");
    li.textContent = name;
    container.appendChild(li);
  });
}

// Initial load
fetchAll();
