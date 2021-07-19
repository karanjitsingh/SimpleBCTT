let sessionData = {
    ongoing: {},
    past: {}
};

let selectedSession = null;
let selectedPatient = null;

function clearTable(parent) {
    rows = parent.querySelectorAll('tr');

    for(let i = 1; i < rows.length; i++)
        rows[i].parentElement.removeChild(rows[i]);
}

function sortSessions(a, b) {
    if (a['sessionid'] === b['sessionid']) {
        return 0;
    }
    else {
        return (a['sessionid'] > b['sessionid']) ? -1 : 1;
    }
}

function capCase(str) {
    arr = str.split(" ");
    for(let i in arr) {
        arr[i] = arr[i].substring(0,1).toUpperCase() + arr[i].substring(1);
    }

    return arr.join(" ");
}

function stampToDate(stamp) {
    const date = new Date(stamp);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}, ${date.getHours()}:${(date.getMinutes().length > 1 ? date.getMinutes() : "0" + date.getMinutes())}`;
}

const network = (new function () {

    this.get = (url, params = {}) => {
        return this.send('get', url, "", {}, params);
    }

    this.post = (url, data) => {
        return this.send('post', url, data, {}, {});
    }

    this.send = (method, url, data, headers, params) => {
        const xhttp = new XMLHttpRequest();

        return new Promise((resolve, reject) => {
            xhttp.onreadystatechange = function () {
                if (this.readyState == 4) {
                    resolve(this.responseText);
                }
            }

            xhttp.onabort = () => {
                reject('abort');
            };

            xhttp.ontimeout = () => {
                reject('timeout');
            };

            xhttp.onerror = () => {
                reject('error');
            };

            try {
                xhttp.open(method, url + this.paramsToString(params));

                Object.keys(headers).forEach((header) => {
                    xhttp.setRequestHeader(header, headers[header]);
                })

                xhttp.send(data);
            } catch (ex) {
                reject(ex);
            }
        })
    }

    this.paramsToString = (params) => {
        return Object.keys(params).reduce((acc, current) => {
            return (acc != '?' ? (acc + "&") : acc) + `${current}=${params[current]}`;
        }, '?');
    }
}());


function showPatientSessions(pname) {
    const table = document.querySelector("#table-patient tbody");

    function populate(container, data, className) {

        for (let i = 0; i < data.length; i++) {
            let row = document.createElement("tr");

            row.className = "selectable";
            if(className)
            {
                row.className += " " + className;
            }

            let timestamp = stampToDate(data[i]['start_time']);
            row.innerHTML = `<td>${data.length - i}</td><td>${timestamp}<td>`;
            row.setAttribute("session", data[i]['sessionid'])
            row.onclick = () => {
                selectSession(row.getAttribute("session"));
            }
            container.appendChild(row)
        }

    }

    data = Object.values(sessionData.ongoing)
    data = data.concat(Object.values(sessionData.past))
    
    data = data.filter(session => session.name.toLowerCase() == pname.toLowerCase());
    data.sort(sortSessions);

    clearTable(table);
    populate(table, data);

}

function showSessionAssessment(session, data) {
    clearAssessmentForm(session.state != 'running');
    const assessment = data.assessment;
    
    if(!assessment.length)
        return;
    
    const rows = document.querySelectorAll("#table-assessment tr");

    for(let i = 1; i < rows.length; i++) {
        const inputs = rows[i].querySelectorAll("input");

        for(let j = 0; j < inputs.length; j++)
            inputs[j].value = assessment[i - 1][j];
    }
}

function plotSessionChart(session, data) {
    console.log("chart", data);

    if (data.data.length) {
        const current = chart.data;
        for (let i = 0; i < data.data.length; i++) {
            current.push({
                index: data.timestamp[i],
                value: data.data[i]
            })
        }
        chart.update(current);
    }
}

function showSessionBadge(session) {
    const islive = session.state == 'running';

    document.querySelector("#session-data .badge-live").style.display =  islive ? "inline-block" : "none";
    document.querySelector("#session-data .badge-done").style.display = (!islive) ? "inline-block" : "none";

}

function showSession(session) {
    const title = document.querySelectorAll("#session-num span")
    title[0].innerHTML = "Session " + session['sessionnumber'];

    clearAssessmentForm();

    const islive = session.state == 'running';

    document.querySelector("#session-data .badge-live").style.display =  islive ? "inline-block" : "none";
    document.querySelector("#session-data .badge-done").style.display = (!islive) ? "inline-block" : "none";

    network.get("/api/getsessiondata", { id: session.sessionid}).then((data) => {
        plotSessionChart(session, JSON.parse(data));
    })

    network.get("/api/getsessionassessment", { id: session.sessionid}).then((data) => {
        showSessionAssessment(session, JSON.parse(data));
    })
}

function selectSession(sessionid)
{
    let session = sessionData.ongoing[sessionid] || sessionData.past[sessionid];
    let pname = session.name;

    document.querySelector("#session-list").style.display = "none";
    document.querySelector("#session-data").style.display = "block";
    document.querySelector("#pname").innerHTML = "Patient Name: " + capCase(pname);

    if(selectedPatient != pname) {
        showPatientSessions(pname);
        selectedPatient = pname;
    }

    if(selectedSession != sessionid)
    {
        chart.reset();
        showSession(session);
        selectedSession = sessionid;
    }   
}

function closeSession() {
    selectedSession = null;
    selectedPatient = null;
    
    document.querySelector("#session-list").style.display = "block";
    document.querySelector("#session-data").style.display = "none";
}

function showSessionData() {

    const ongoing = Object.values(sessionData.ongoing).sort(sortSessions);
    const past = Object.values(sessionData.past).sort(sortSessions);

    const tableOngoing = document.querySelector("#table-ongoing tbody");
    const tablePast = document.querySelector("#table-past tbody");

    function populate(container, data, className) {

        for (let i = 0; i < data.length; i++) {
            let row = document.createElement("tr");

            row.className = "selectable";
            if(className)
            {
                row.className += " " + className;
            }

            let name = capCase(data[i]['name']);
            let timestamp = stampToDate(data[i]['start_time']);
            let sessionid = data[i]['sessionid'];
            row.innerHTML = `<td>${i + 1}</td><td>${name}</td><td>${timestamp}<td>${sessionid}</td>`;
            row.onclick = () => {
                const cols = row.querySelectorAll("td");
                selectSession(cols[cols.length - 1].innerText);
            }
            container.appendChild(row)
        }

    }

    clearTable(tableOngoing);
    clearTable(tablePast);

    populate(tableOngoing, ongoing);
    populate(tablePast, past);
}

network.get("/api/getsessions").then((data) => {
    console.log("Session data")
    console.log(data)
    
    data = JSON.parse(data);

    for(let i = 0; i < data[0].length; i++) {
        sessionData.ongoing[data[0][i].sessionid] = data[0][i];
    }

    for(let i = 0; i < data[1].length; i++) {
        sessionData.past[data[1][i].sessionid] = data[1][i];
    }

    showSessionData();
});

function clearAssessmentForm(disable = true) {
    const inputs = document.querySelectorAll("#table-assessment input");
    
    for(let i = 0; i < inputs.length; i++) {
        inputs[i].value = "";
        if (disable)
            inputs[i].setAttribute("disabled", "");
        else
            inputs[i].removeAttribute("disabled")
    }
}

function updateAssessment() {
    const rows = document.querySelectorAll("#table-assessment tr");

    const form = []

    for(let i = 1; i < rows.length; i++) {
        const inputs = rows[i].querySelectorAll("input");
        const data = [];

        for(let j = 0; j < inputs.length; j++) {
            data.push(inputs[j].value);
        }

        form.push(data);
    }

    network.post("/api/updateassessment", JSON.stringify({
        sessionid: selectedSession,
        assessment: form
    }));
}

function generateAssessmentForm() {
    const preform = document.querySelector("#pre-form");
    const table = document.querySelector("#table-assessment");
    const tbody = document.createElement("tbody");

    table.appendChild(tbody);

    header = document.createElement("tr");
    header.innerHTML = `<th>Min</th><th>RPE</th><th>VAS Scale</th><th>Symptom reports</th><th>Observations</th>`;
    tbody.appendChild(header);



    for (let i = 0; i < 22; i++) {
        let row = document.createElement("tr");
        let index = document.createElement("th");
        if (i == 0)
            index.innerHTML = "REST";
        else if (i == 21)
            index.innerHTML = "Post<br/>(2 min)";
        else
            index.innerHTML = i;

        row.appendChild(index);

        for (let i = 0; i < 4; i++) {
            let cell = document.createElement("td");
            let input = document.createElement("input")
            input.type = "text";
            input.className = "form-control";
            input.onchange = updateAssessment;
            input.setAttribute("disabled", "")

            cell.appendChild(input);
            row.appendChild(cell)
        }

        tbody.appendChild(row);
    }
}

var chartx;
var charty

chart = (new function () {
    this.init = function() {
        this.svg = d3.select("#chart").append("svg");
        const data = this.data;
        const totalwidth = document.querySelector("#chart").clientWidth;

        this.margin = { top: 10, right: 30, bottom: 50, left: 50 };
        let margin = this.margin;

        this.width = totalwidth - margin.left - margin.right - 20;
        this.height = 350 - margin.top - margin.bottom;

        let svg = this.svg;
        let width = this.width;
        let height = this.height;

        // append the svg object to the body of the page
        svg.attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .attr("viewBox","0 0 " + ( width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom)) 
        this.g = svg.append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

        let g = this.g

        // label for x axis
        g.append("text")
        .attr("transform",
            "translate(" + (width / 2) + " ," +
            (height + margin.top + 30) + ")")
        .attr("fill", "#444")
        .style("text-anchor", "middle")
        .text("Minute");

        // text label for the y axis
        g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left)
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .attr("fill", "#444")
            .style("text-anchor", "middle")
            .text("Heart Rate");

            // append the svg object to the body of the page
        svg.attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .attr("viewBox","0 0 " + ( width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom)) 
        
        g = svg.append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");


            // Add X axis --> it is a date format
        var xscale = d3.scaleLinear()
            .domain(d3.extent([...Array(26).keys()], function (i) { return i; }))
            .range([0, width]);
            
        g.append("g")
            .attr("transform", "translate(0," + height + ")")
            .style("stroke-width", "0")
            .call(d3.axisBottom(xscale));

        maxy = d3.max(data, d => d.value);
        miny = d3.min(data, d => d.value);

        scalemax = Math.max(Math.abs(maxy), Math.abs(miny))

        // Add Y axis
        var yscale = d3.scaleLinear()
            .domain([-scalemax, scalemax])
            .range([height, 0]);

        g.append("g")
            .attr("id", "y-axis")
            .call(d3.axisLeft(yscale));

        // Add the line
        g.append("path")
            .attr("id", "line")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5);

        this.yscale = yscale;
        this.xscale = xscale;
    }


    this.update = function(data) {
        this.data = data;
        
        maxy = d3.max(data, d => d.value);
        miny = d3.min(data, d => d.value);

        scalemax = Math.max(Math.abs(maxy), Math.abs(miny));

        var yscale = this.yscale;
        var xscale = this.xscale;

        yscale.domain([miny, maxy])

        d3.select("#y-axis")
            .transition()
            .call(d3.axisLeft(yscale));

        d3.select("#line")
            .datum(data)
            .transition()
            .attr("d", d3.line()
            .x(function (d) { return xscale((d.index - data[0].index)/60) })
            .y(function (d) { return yscale(d.value) })
            .curve(d3.curveBasis)
        );
    }

    this.reset = function() {
        d3.select("#line")
            .transition()
            .attr("d", "");

        this.data = [];
    }

    this.data = [];
}())

window.onload = () => {
    
    if(init)
        return;
    init = true;

    chart.init();

    document.querySelector("#session-data").style.display = "none";
    document.querySelector("#session-data").style.opacity = "1";

    generateAssessmentForm();

    ws = new WebSocket("ws://localhost:3001/live");
    ws.onmessage = (message) => {
        let data = JSON.parse(message.data)
        wsupdate(data);
    }

    document.querySelector("#close-btn").onclick = closeSession;
}

function wsupdate(data) {
    if(!data.type)
        return;

    switch(data.type) {
        case "session":
            delete sessionData.ongoing[data.data.sessionid];
            delete sessionData.past[data.data.sessionid];

            if(data.data.state == "running")
                sessionData.ongoing[data.data.sessionid] = data.data;
            else
                sessionData.past[data.data.sessionid] = data.data;

            showSessionData()

            if(selectedPatient == data.name)
                showPatientSessions(pname);

            if(data.data.sessionid == selectedSession)
                showSessionBadge(data.data)

            break;
        
        case "update":
            if(data.data.sessionid == selectedSession) {
                plotSessionChart(null, data.data);
            }
            break;
    }
}

let init = false;