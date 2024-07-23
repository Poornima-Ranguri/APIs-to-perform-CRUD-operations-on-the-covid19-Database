const express = require("express");

const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19India.db");
let database = null;

const InitializeDbAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server Running at http://localhost//3000");
    });
  } catch (e) {
    console.log(`DB Error ${e.message}`);
    process.exit(1);
  }
};

InitializeDbAndServer();

const convertDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictObjectToResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

//API 1

app.get("/states/", async (request, response) => {
  const getStatesQuery = `SELECT * FROM state ORDER BY state_id;`;
  const stateArray = await database.all(getStatesQuery);
  response.send(
    stateArray.map((eachState) => convertDbObjectToResponseObject(eachState))
  );
});

//API 2 Get State based on ID

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `SELECT * FROM state WHERE state_id = '${stateId}';`;
  const stateResult = await database.get(getStateQuery);
  response.send(convertDbObjectToResponseObject(stateResult));
});

//API 3 Create a District in the district table

app.post("/districts/", async (request, response) => {
  const { stateId, districtName, cases, cured, active, deaths } = request.body;
  const addDistrictQuery = `INSERT INTO
    district (state_id, district_name, cases, cured, active, deaths)
    VALUES
        (${stateId},'${districtName}',${cases},${cured}, ${active}, ${deaths});`;

  await database.run(addDistrictQuery);
  response.send("District Successfully Added");
});

//API 4

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = ` SELECT
      *
    FROM
     district
    WHERE
      district_id = ${districtId};`;
  const districtResult = await database.get(getDistrictQuery);
  response.send(convertDistrictObjectToResponseObject(districtResult));
});

//API 5

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteQuery = `DELETE FROM district WHERE district_id = ${districtId};`;
  await database.run(deleteQuery);
  response.send("District Removed");
});

//API 6

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const updateDistrictQuery = `
            UPDATE 
                district
            SET
                district_name ='${districtName}',
                state_id = ${stateId},
                cases = ${cases},
                cured = ${cured},
                active = ${active},
                deaths = ${deaths}
            WHERE 
                district_id = ${districtId};      
    `;
  await database.run(updateDistrictQuery);
  response.send("District Details Updated");
});

//API 7

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getDistrictStatisticsQuery = `
        SELECT
            SUM(cases),
            SUM(cured),
            SUM(active),
            SUM(deaths)
        FROM 
            district
        WHERE
            state_id = ${stateId};        
    `;

  const statsResult = await database.get(getDistrictStatisticsQuery);

  response.send({
    totalCases: statsResult["SUM(cases)"],
    totalCured: statsResult["SUM(cured)"],
    totalActive: statsResult["SUM(active)"],
    totalDeaths: statsResult["SUM(deaths)"],
  });
});

//API 8

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
      SELECT    
             state_name
        FROM
            district
        NATURAL JOIN
             state
        WHERE 
             district_id=${districtId};`;

  const state = await database.get(getDistrictQuery);
  response.send({ stateName: state.state_name });
});

module.exports = app;
