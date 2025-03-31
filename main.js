// Argo Football Ticker - main.js with fallback from direct API-Football to SportsDB

document.addEventListener("DOMContentLoaded", () => {
  const SPORTSDB_API_KEY = "3";
  const API_FOOTBALL_KEY = "15dc1d1bd5e6766f52304b50ac41770b";
  const TEAM_ID = 1357; // Plymouth Argyle for API-Football
  const SPORTSDB_TEAM_ID = "133836"; // Plymouth Argyle for TheSportsDB
  const CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache
  let lastRefrexsh = 0;

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

  function getApiCallCount() {
    const today = new Date().toISOString().split("T")[0];
    const record = JSON.parse(localStorage.getItem("apiLimitRecord")) || {};
    return record.date === today ? record.count : 0;
  }

  function incrementApiCallCount() {
    const today = new Date().toISOString().split("T")[0];
    let record = JSON.parse(localStorage.getItem("apiLimitRecord")) || {};
    if (record.date !== today) {
      record = { date: today, count: 0 };
    }
    record.count += 1;
    localStorage.setItem("apiLimitRecord", JSON.stringify(record));
  }

  function shouldFetchNewData() {
    const lastFetch = localStorage.getItem("lastApiFetchTime");
    return !lastFetch || (Date.now() - parseInt(lastFetch)) > CACHE_DURATION;
  }

  function fetchUpcoming() {
    if (getApiCallCount() >= 95) {
      console.warn("API-Football limit reached. Falling back to TheSportsDB.");
      fetchUpcomingFromSportsDB();
      return;
    }

    if (!shouldFetchNewData()) {
      console.log("Using cached upcoming match data.");
      return;
    }

    fetch(`https://v3.football.api-sports.io/fixtures?team=${TEAM_ID}&next=5`, {
      method: "GET",
      headers: {
        "x-api-key": API_FOOTBALL_KEY // Direct API key, not via RapidAPI
      }
    })
      .then(res => res.json())
      .then(data => {
        const matches = data.response;
        console.log("Fetched Plymouth upcoming fixtures:", matches);

        if (!matches || matches.length === 0) {
          console.warn("No fixtures returned from API-Football. Falling back.");
          fetchUpcomingFromSportsDB();
          return;
        }

        const ticker = document.getElementById("top-ticker");
        const upcoming = matches.map(match => {
          const home = match.teams.home.name;
          const away = match.teams.away.name;
          const date = new Date(match.fixture.date).toISOString().split("T")[0];
          return `<a href='https://www.api-football.com/fixture/${match.fixture.id}' target='_blank'>${date} – ${home} vs ${away}</a>`;
        });

        if (ticker) {
          ticker.innerHTML = upcoming.join(" &nbsp;•&nbsp; ");
        }

        localStorage.setItem("lastApiFetchTime", Date.now().toString());
        incrementApiCallCount();
      })
      .catch(err => {
        console.error("API-Football failed:", err);
        fetchUpcomingFromSportsDB();
      });
  }

  function fetchUpcomingFromSportsDB() {
    const matchIds = ["2081976", "2081993", "2082000"];
    Promise.all(matchIds.map(id =>
      fetch(`https://www.thesportsdb.com/api/v1/json/3/lookupevent.php?id=${id}`)
        .then(res => res.json())
        .then(data => data.events?.[0])
    )).then(matches => {
      const ticker = document.getElementById("top-ticker");
      const upcoming = matches
        .filter(Boolean)
        .map(event => {
          const text = `${event.dateEvent} – ${event.strHomeTeam} vs ${event.strAwayTeam}`;
          return `<a href='https://www.thesportsdb.com/event/${event.idEvent}' target='_blank'>${text}</a>`;
        });

      if (ticker) {
        ticker.innerHTML = upcoming.join(" &nbsp;•&nbsp; ");
      }
    });
  }

  function fetchPrevious() {
    fetch(`https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/eventslast.php?id=${SPORTSDB_TEAM_ID}`)
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
    fetch(`https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/eventslast.php?id=${SPORTSDB_TEAM_ID}`)
      .then(res => res.json())
      .then(data => {
        const event = data.results?.[0];
        if (!event) return;

        const plyLogo = document.getElementById("plymouth-logo");
        const oppLogo = document.getElementById("opponent-logo");
        if (plyLogo) plyLogo.src = `https://r2.thesportsdb.com/images/media/team/badge/wod5cj1689630278.png`;

        const isHome = event.strHomeTeam === "Plymouth Argyle";
        const badge = isHome ? event.strAwayTeamBadge : event.strHomeTeamBadge;
        if (oppLogo && badge) oppLogo.src = badge;

        return fetch(`https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/lookupevent.php?id=${event.idEvent}`);
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
    const container = document.querySelector(`#${containerId}`);
    if (!container) return;
    container.innerHTML = "";
    const names = [...(forwards?.split("; ") || []), ...(mids?.split("; ") || []), ...(defs?.split("; ") || []), ...(gk?.split("; ") || [])];
    if (names.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No lineup data available.";
      container.appendChild(li);
    } else {
      names.forEach(name => {
        const li = document.createElement("li");
        li.textContent = name;
        container.appendChild(li);
      });
    }
  }

  fetchAll();
});
