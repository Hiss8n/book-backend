import cron from "cron";

import http from "http";

const jobs = new cron.CronJob("*/840 * * * * *", function () {
  http
    .get(process.env.API_URL, (res) => {
      if (res.statusCode === 200) console.log("running on every 15 minutes");
      else console.error("get request failed", res.statusCode);
    })
    .on("error", (e) => console.log(`res response failed ${e}`));
});

export default jobs;
