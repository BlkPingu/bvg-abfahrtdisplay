class DeparturesTable extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.stations = ["Berlin Hbf", "Alexanderplatz", "Zoologischer Garten"]; // Example stations
    this.currentStationIndex = 0; // Start with the first station

    this.shadowRoot.innerHTML = `
      <style>
        /* Base styles */
        :host {
          display: block;
          font-family: sans-serif;
          color: #ccc;
          background-color: #061350;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        table {
          width: 100%;
          background-color: #0D1B2A;
          color: #fff;
          border-collapse: collapse;
        }
        .tableHeader th {
          padding: 10px;
          text-align: left;
          background-color: #1B263B;
          border-bottom: 1px solid #415A77;
        }
        th, td {
          padding: 8px;
          text-align: left;
        }
        tr:nth-child(even) {
          background-color: #1B263B;
        }
        .departure, .now, .min {
          text-align: center;
        }
        /* Station switcher styles */
        .station-switcher {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          background-color: #415A77;
          padding: 10px;
          border-radius: 8px;
        }
        .station-switcher button {
          cursor: pointer;
          background-color: #778DA9;
          border: none;
          padding: 5px 10px;
          border-radius: 5px;
          color: white;
          transition: background-color 0.3s ease;
        }
        .station-switcher button:hover {
          background-color: #1B263B;
        }
        .station-switcher span {
          font-size: 20px;
          font-weight: bold;
        }
        /* Additional styles */
        .delayEarly { color: #4CAF50; } /* Green */
        .delayLate { color: #F44336; } /* Red */
        .now { animation: blinker 2s linear infinite; }
        @keyframes blinker {
          50% { opacity: 0; }
        }
      </style>
      <div class="station-switcher">
          <button id="prevStation">&lt;</button>
          <span id="stopName">${this.stations[this.currentStationIndex]}</span>
          <button id="nextStation">&gt;</button>
      </div>
      <div id="departuresTableContainer"></div>
    `;

    this.updateStation();
  }

  connectedCallback() {
    this.shadowRoot.getElementById('prevStation').addEventListener('click', () => this.switchStation(-1));
    this.shadowRoot.getElementById('nextStation').addEventListener('click', () => this.switchStation(1));
  }

  switchStation(direction) {
    this.currentStationIndex += direction;
    if (this.currentStationIndex >= this.stations.length) {
      this.currentStationIndex = 0; // Loop back to the first station
    } else if (this.currentStationIndex < 0) {
      this.currentStationIndex = this.stations.length - 1; // Loop to the last station
    }
    this.updateStation();
  }

  updateStation() {
    const stationName = this.stations[this.currentStationIndex];
    this.shadowRoot.getElementById('stopName').textContent = stationName;
    this.setAttribute('station', stationName); // Update the station attribute
    this.getStop(); // Fetch new data for the current station
  }

  async getStop() {
    const queryString = this.getAttribute("station") || "Berlin Hbf";
    try {
      const response = await fetch(`https://v6.bvg.transport.rest/locations?query=${queryString}&results=1`);
      if (!response.ok) throw new Error(`API responded with status ${response.status}`);
      const [stop] = await response.json();
      console.log("Stop information:", stop)
      this.stopName = stop.name;
      this.stopId = stop.id;
      this.shadowRoot.getElementById("stopName").innerText = this.stopName;
      this.getTimeTable();
    } catch (error) {
      console.error("Failed to fetch stop information:", error);
    }
  }

  async getTimeTable() {
    if (!this.stopId) {
      console.log("Stop ID is not set. Unable to fetch departures.");
      return;
    }
    try {
      console.log(this.stopId);
      const response = await fetch(`https://v6.bvg.transport.rest/stops/${this.stopId}/departures?results=10`);
      if (!response.ok) throw new Error(`API responded with status ${response.status}`);
      const data = await response.json(); // This is the full object containing the 'departures' array
      this.updateDeparturesTable(data.departures); // Pass only the 'departures' array
    } catch (error) {
      console.error("Failed to fetch departures:", error);
    }
  }



  updateDeparturesTable(departures) {
    const container = this.shadowRoot.getElementById("departuresTableContainer");
    container.innerHTML = ""; // Clear existing content
    const table = document.createElement("table");
    const header = table.insertRow();
    ["Departure", "Line", "Direction / Destination", "Platform"].forEach(text => {
      const th = document.createElement("th");
      th.textContent = text;
      header.appendChild(th);
    });

    departures.forEach(departure => {
      const row = table.insertRow();
      row.insertCell().innerHTML = this.formatDeparture(departure.when, departure.delay);
      row.insertCell().appendChild(this.createLineElement(departure.line));
      row.insertCell().textContent = departure.direction;
      row.insertCell().textContent = this.formatPlatform(departure.platform);
    });

    container.appendChild(table);
  }

  formatDeparture(departureTime, departureDelay) {
    let now = new Date();
    let departureDate = new Date(departureTime);
    let difference = Math.round((departureDate - now) / (1000 * 60)); // Difference in minutes
    let delay = Math.round(departureDelay / 60); // Delay in minutes
    if (difference <= 0) {
      return `<span class="nowTime">now</span>`;
    } else {
      let delayStr = delay ? `(<span class="${delay > 0 ? 'delayLate' : 'delayEarly'}">${delay > 0 ? '+' : ''}${delay}</span>)` : "";
      return `<span class="min">${difference}</span> min ${delayStr}`;
    }
  }

  formatPlatform(platform) {
    return platform || "-";
  }

  createLineElement(line) {
    let lineInner = document.createElement('span');
    lineInner.textContent = line.name;
    lineInner.className = `product ${line.product}`;
    return lineInner;
  }
}

customElements.define('departures-table', DeparturesTable);
